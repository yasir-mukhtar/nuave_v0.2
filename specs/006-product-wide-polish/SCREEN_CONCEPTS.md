# Per-screen concept brainstorm — product-wide design pass

> Status: **Draft** — unapproved working document. Do not implement from this.
> Created: 2026-08-19
> Feeds into: `SPEC.md` (same folder), which is the approval artifact.
> Direction: **calm instrument**, founder-approved 2026-08-19 (see
> `FOUNDER_DECISIONS.md`).

This document is the per-screen brainstorm behind the draft design-pass spec.
It states, for every screen a customer sees: the emotional job, the design
concept in one sentence, the visual and motion vocabulary, what the screen
borrows from notable products and what makes Nuave's version distinct, and the
failure and recovery states that must be rendered at the same quality as the
happy path.

Behavioral truth lives in `docs/journey/*.md` and `docs/VOICE.md`. This
document never overrides them; it gives them a face. Settled Indonesian labels
are copied verbatim and never paraphrased.

## The direction in one paragraph

Calm instrument: a white or near-white canvas, ink text, hairline borders,
one restrained accent (`#533afd`, actions and active states only), 6–10px
radii, generous whitespace, and typography that carries hierarchy through size
and weight rather than color or decoration. Geist Sans everywhere in the
product; a system serif stack ("Iowan Old Style", "Palatino Linotype",
Palatino, Georgia, serif) appears only on the report's display surfaces.
Motion is beat-bound: it plays only where it serves the screen's emotional
job, runs 150–400ms with an ease-out curve, is tied to real state, and always
has a `prefers-reduced-motion` fallback. Nothing loops forever. The reference
posture is apple.com's restraint, vercel.com's type discipline, gov.uk's
plainness, wise.com's honest status language — absorbed, then executed
cleaner, sharper, and quieter.

## The emotional beat map

The journey is one emotional arc. Each screen owns exactly one beat:

```text
Landing            discovery          "I want to know where I stand."
Order Preview      recognition        "This is my business."
Payment status     trust              "My money is safe; I know what's next."
Business Facts     ownership          "Nuave did the work; I only correct it."
Questions          anticipation       "These are my customers' questions."
Audit Run          calm confidence    "It's working; nothing will be lost."
Audit Report       insight & action   "I see what happened and what to do."
Report PDF         the artifact       "This was worth paying for."
```

A screen that tries to carry two beats carries neither. When a design choice
competes with the beat, the beat wins.

## Cross-screen motifs

Four motifs recur so seven screens feel like one product:

1. **The scan line.** A thin gradient line that sweeps a card top-to-bottom
   exactly once or twice, then stops. It plays at the landing intake submit
   and when Nuave prepares facts. It never loops, never decorates, and always
   accompanies real work. It is the product's single signature motion.
2. **Provenance pills.** Six small quiet chips — `Ditemukan di website`,
   `Ditemukan di Google Maps`, `Ditemukan di Instagram`, `Saran Nuave`,
   `Ditambahkan oleh Anda`, `Perlu diperiksa` — one visual treatment wherever
   a value's origin matters (preview, facts, and by extension the report's
   method section).
3. **The evidence triad.** Observation, interpretation, and action are always
   three visually distinct layers: `Yang ditemukan`, `Artinya bagi Anda`,
   `Yang dapat dilakukan`. The pattern repeats in findings, actions, and
   test-by-test details so the reader learns it once.
4. **The quiet count.** Results are set as ink numerals with their
   denominator, never gauges, never percentages, never green or red. `4/10`
   is typography, not a chart.

---

## 1. Landing — discovery

**Emotional job.** A business owner who has heard that "customers ask AI now"
should feel the question land personally, without fear-mongering: *I want to
know where I stand.*

**Concept.** One quiet question over one confident input — the page asks the
visitor's question ("Apakah brand Anda muncul di ChatGPT?") and puts the
one-field intake directly beneath it, so the hero is an invitation, not a
billboard.

**Visual and motion vocabulary.**

- Centered hero: ink display headline (Geist, tight tracking), one subline,
  one large input with a blinking caret, detection chip inside the field
  (`Situs web` / `Instagram`), the settled CTA `Cek bisnis saya di AI`.
- On submit: the scan-line motif plays across the intake card, then the page
  hands off to the preview. The motif establishes continuity with the audit
  tool's hero.
- Below the hero: how-it-works, what-you-receive, boundaries, data policy,
  FAQ — calm single-column sections separated by hairlines and whitespace,
  not nested cards. The illustrative report preview stays, always labeled
  `Ilustrasi`.
- Entrance: one 400ms staggered fade-up (headline → subline → input). Nothing
  else moves. No marquee, no cursor-following glow, no drifting gradients.

**Borrows from:** apple.com product pages (one message per screen, air around
it), vercel.com (Geist type discipline, hairline structure), gov.uk (plain
service language). **Distinct because:** the intake field *is* the hero — no
dashboard screenshot, no stats wall, no urgency device. The page's confidence
comes from asking a real question and immediately offering to answer it.

**Failure and recovery states at equal quality.**

- Unsupported or unreadable link: gentle inline hint under the field, value
  preserved, no red block, no dead end.
- Ambiguous or unidentifiable business: the page asks for the minimum (name,
  city or area) in the same calm register.
- Fixture preview disabled on the server: the designed unavailable state, not
  a raw error.

## 2. Order Preview — recognition

**Emotional job.** *This is my business, I understand what Nuave will check,
and I know what I will receive for the price.*

**Concept.** A found-identity card that introduces the business back to its
owner — "Kami menemukan bisnis Anda" — followed by a quote document, not a
checkout funnel: fixed price, fixed scope, fixed validity, everything visible
before the paid action.

**Visual and motion vocabulary.**

- Identity card: logo or neutral initial fallback, business name, sourced
  short description, the submitted source with its provenance pill, and the
  `Bukan bisnis Anda?` correction path. The card materializes from the
  scan-line handoff for continuity.
- Three quiet sections in reading order: what Nuave checks, what the customer
  receives, how it works.
- Order summary panel: `Rp99.000` set large in ink, "no tax or additional
  fee", 30-day quote validity, the one-audit nature, recipient email field
  with its three stated uses, and the priced action `Bayar Rp99.000`. The
  upper action `Lanjut ke pembayaran` only scrolls.
- The disclaimer that this preview is not an audit result is a designed
  element beside the identity card, not fine print.
- Motion: the card's materialize-in, sections fading once on first scroll.
  Nothing else.

**Borrows from:** Apple Store order summary (price clarity and restraint),
wise.com (fees stated plainly, nothing hidden), stripe.com checkout pages
(trust through quietness). **Distinct because:** the page refuses to perform
value — no competitor hints, no "what AI says about you" teaser, no
countdown. The honesty about what has *not* been measured yet is the trust
mechanism.

**Failure and recovery states at equal quality.**

- Loading: "looking for the business" language — never implies an audit is
  running.
- Partial preview: missing logo or description degrades to clean fallbacks;
  the page never invents content.
- Business not confidently identified: asks for name and city/area; never
  guesses between branches.
- Unsupported or inaccessible link: explains what Nuave can read; offers the
  three accepted source types.
- Quote expired (30 days): explains the refresh requirement plainly.
- Returned from cancelled or failed payment: preview, source, and email
  intact; states clearly that no audit has started.

## 3. Payment status destination — trust

**Emotional job.** *My money is safe, and I know exactly what happens next* —
including when the answer is "not yet" or "this didn't work."

**Concept.** One stable order page that always answers three things at a
glance — **status, amount, next action** — for every payment state. Midtrans
Snap hosts the payment itself; Nuave's page is the calm source of truth the
customer returns to.

**Visual and motion vocabulary.**

- One order card: business name, order reference, masked recipient email,
  `Rp99.000`, and — when relevant — the actual payment expiry.
- One status banner per state, tone matched to meaning: checking is a neutral
  single pulse; pending is muted amber; confirmed is one quiet success mark
  (never confetti); expired and cancelled are ink-neutral, not alarming red;
  failed is sober with a provider reference preserved for support;
  temporarily unavailable is neutral and explicit about not paying twice.
- Exactly one primary action per state: `Cek lagi`,
  `Lihat petunjuk pembayaran`, `Saya sudah membayar. Cek lagi.`,
  `Pilih cara pembayaran lain`, `Buat pembayaran baru`, `Coba lagi`,
  `Hubungi bantuan`, or — only after server verification —
  `Periksa informasi bisnis`.
- Motion: state changes crossfade 250ms; the checking state pulses once
  slowly rather than spinning forever, and degrades to a manual `Cek lagi`
  instead of an endless spinner.

**Borrows from:** wise.com transfer status (honest state language, no false
certainty), Apple Pay confirmation (restraint at the moment of success),
Midtrans Snap itself (familiar hosted payment surface).
**Distinct because:** the page never celebrates before server verification,
never treats a browser callback as proof, and says "Audit Anda belum dimulai"
in every non-confirmed state — the sentence that prevents every support
ticket.

**Failure and recovery states at equal quality** — all seven designed, per
`docs/journey/02-payment.md`:

- Checking (including prolonged checking → manual `Cek lagi`).
- Waiting for payment, with actual expiry and instructions route.
- Confirmed, unlocked only by verified server status.
- Expired, with new-attempt creation under the same order.
- Cancelled, with retry or return to the order summary.
- Failed or denied, without raw provider or fraud messages.
- Temporarily unavailable, explicitly instructing the customer not to pay a
  second time.

## 4. Business Facts — ownership

**Emotional job.** *Nuave already understands most of my business. I only
need to check and correct it.*

**Concept.** A prepared document the owner annotates: every material field
arrives pre-filled with a provenance pill, editing happens in place, and the
confirmation checkbox reads as a signature, not a formality.

**Visual and motion vocabulary.**

- Single reading column (max ~640px), field cards separated by hairlines,
  generous line height — the page reads like a letter about the business.
- The six provenance pills as a quiet, consistent visual system; the eye
  learns in one screen that `Saran Nuave` means "check this" and `Ditemukan
  di website` means "sourced".
- Category and products as selectable chips; the comparison business as one
  proposed card with `Gunakan bisnis ini` / `Ganti` / `Masukkan bisnis lain`;
  source conflicts as one muted-amber callout asking for the current value.
- The confirmation checkbox and the primary action `Buat pertanyaan audit`
  sit in a calm persistent footer; validation moves focus to the exact field,
  never a generic error banner.
- Motion: edit-in-place transitions and a micro "saved" confirmation; when
  preparation is still running, an honest preparing state with elapsed time
  and a manual-entry path — no skeleton theater.

**Borrows from:** Notion (inline editing that never feels like a form),
gov.uk (form plainness, one thing per page logic), Apple contact cards
(editing in place). **Distinct because:** provenance is the interface — no
confidence percentages, no AI sparkle effects, no superlatives. The screen
communicates "we did the work" through prepared content, not through
animation.

**Failure and recovery states at equal quality.**

- Preparing: honest progress, "Audit belum dimulai", recoverable if it
  exceeds its window.
- Extraction failed or source inaccessible: the same screen opens with manual
  fields; the paid order is never at risk.
- Sources conflict: the conflict callout with each version and its source.
- Sensitive personal text entered: processing stops for that text, with a
  calm explanation of what safe business information is needed.
- Refresh or return: the saved draft and all edits restore; no repeated
  preparation call.

## 5. Questions — anticipation

**Emotional job.** *These sound like questions my customers would actually
ask — and I control exactly what gets tested.*

**Concept.** A reading list first, an editor second: ten numbered cards in
the final order, each carrying its composition chip, with editing available
in place — and one deliberate point-of-no-return dialog at the end.

**Visual and motion vocabulary.**

- Header: `Periksa pertanyaan audit`, the standing line `Audit belum
  dimulai.`, and the live composition summary `5 Tanpa menyebut bisnis Anda ·
  5 Menyebut bisnis Anda · 10 pertanyaan` that updates as edits land.
- Question cards: number, exact question text, composition chip, a quiet
  `Ubah` action that morphs the card into a multiline field with
  `Simpan pertanyaan` / `Batalkan`, and — after an edit —
  `Kembalikan saran Nuave`.
- Composition warnings (`Hampir semua pertanyaan menyebut nama bisnis Anda` /
  the inverse) as muted-amber advisory panels with
  `Lihat saran Nuave` / `Tetap gunakan pertanyaan saya` — advice, never a
  blockade. Narrow hard stops render as restrained inline errors on the
  specific card.
- Persistent action area: `10 pertanyaan siap dijalankan`,
  `Kembali ke informasi bisnis`, `Jalankan audit` — opening the confirmation
  dialog `Mulai audit sekarang?` with `Kembali periksa` /
  `Mulai audit sekarang`. The dialog is the ceremony: scale-in 200ms, focus
  trapped, Escape closes.
- Motion: card-to-editor morph, chip count updates, the dialog. When the
  suggestion call runs, one honest preparing state — never a fake multi-stage
  progress animation for a single generation call.

**Borrows from:** Linear (reading-first lists where editing is secondary),
Apple confirmation dialogs (irreversibility treated with ceremony).
**Distinct because:** the composition measure is the customer's tool, shown
in their language — not internal telemetry. Warnings explain measurement
consequences and then respect the customer's choice.

**Failure and recovery states at equal quality.**

- Generation fallback: `Kami menyiapkan pertanyaan dasar` disclosure with
  full editing intact; no provider jargon.
- A blocked question: inline, specific, in the customer's language; only the
  narrow hard stops block.
- Fact change after questions exist: explicit warning that the pack will be
  replaced, then one regeneration.
- Refresh or another device: suggestions and edits restore; no repeated
  generation call.
- Double-clicked start: one audit, one job — the UI never implies otherwise.

## 6. Audit Run — calm confidence

**Emotional job.** *Nuave is doing the work I paid for. I can see genuine
progress, I do not have to babysit the page, and I can reach a person if
something goes wrong.*

**Concept.** A quiet status board: the completed count is the hero element,
the ten questions are listed with honest state labels, the safe-to-close
message is always present, and nothing on the screen moves unless the server
says something real happened.

**Visual and motion vocabulary.**

- The count, set large in ink: `6 dari 10 pertanyaan selesai`. Elapsed time
  beside it. The standing line `Anda boleh menutup halaman ini. Audit akan
  tetap berjalan.` with the masked recipient email.
- Question rows in approved order, each with one of the five settled labels:
  `Menunggu`, `Sedang diuji`, `Mencoba kembali`, `Selesai`,
  `Belum berhasil diuji`. The actively-testing row carries the screen's only
  ambient motion: one slow, subtle pulse.
- State changes transition 150–250ms. No progress bars beyond the completed
  count, no fabricated per-question fills, no fake streaming answers, no
  celebration at 10/10 — the report may contain unfavorable evidence, so the
  completion state is `Laporan Anda sudah siap`, never `Selamat!`.
- Report-stage states belong to the same page: the failure banner
  `Laporan belum berhasil dibuat`, the human-attention state, and the
  help confirmation `Permintaan bantuan sudah dikirim` — each with
  `Minta bantuan` as a calm, ever-available path.

**Borrows from:** Apple's software-update screens (calm during long
operations), CI status boards minus their jargon.
**Distinct because:** the honesty is the aesthetic. A screen that refuses to
fabricate progress reads as more confident, not less — the customer learns to
trust every pixel because none of them lie.

**Failure and recovery states at equal quality.**

- One question retrying: `Mencoba kembali · percobaan 2` on the affected row
  only; completed rows untouched.
- Automatic recovery exhausted: `9 dari 10 pertanyaan selesai` with
  `Coba lagi pertanyaan ini` and `Minta bantuan`; completed work stated as
  preserved.
- Report generation failed but retrying, and report needs human attention:
  the two settled banners, never exposing provider or exception detail.
- Browser closed mid-run: on return, the page restores from server state and
  says work continued.
- Fixture mode: the same board with its persistent simulation disclosure —
  the simulated run is unmistakably simulated.

## 7. Audit Report (web) — insight and action

**Emotional job.** *I can see what happened when my questions were tested,
what matters, and what my team should do next — and I can defend this to the
person who approves the work.*

**Concept.** The designed document: calm product chrome (a thin top bar with
`Download PDF`) around a document-grade report — a cover block, the result
set typographically in ink, and five numbered sections separated by hairline
rules.

**Visual and motion vocabulary.**

- Cover block: `AI Visibility Report` eyebrow, the business name in the
  report serif at display size, scope and audit date, the ten-question scope,
  recipient attribution, and the primary action `Download PDF` (with truthful
  pending or failed state beside it when the artifact is not ready).
- Main result: `Bisnis Anda muncul di 4 dari 10 pertanyaan` with `4/10` set
  large in ink — never a gauge, never a percentage, never green or red.
  Directly beneath: `Tanpa menyebut bisnis Anda` and `Menyebut bisnis Anda`
  with their own denominators (`Tidak diuji` when a dimension had no eligible
  question). Beside the result, not in fine print: the snapshot limitation
  (`Hasil ini dapat berubah`).
- Sections 01–05: main result; key findings; what to do next; test-by-test;
  how this audit works. The evidence triad (`Yang ditemukan` /
  `Artinya bagi Anda` / `Yang dapat dilakukan`) is the repeating internal
  pattern of findings and actions. Other businesses appear as
  `bisnis lain yang disebut` with observed counts and test references — never
  ranked, never called competitors without verified context.
- Test-by-test entries carry the exact question, plain-language result, exact
  excerpt, sources, and observation time; all ten are present on screen and
  expand fully in print.
- Method and provider mechanics live at the bottom in the collapsed
  `Tentang audit ini` disclosure — exact, complete, and out of the way.
- Motion: none beyond one settle-in fade. A document does not perform.

**Borrows from:** the live ReportView's existing serif instinct (kept and
refined), well-set consultancy briefs, gov.uk content design (scannability
without dashboards). **Distinct because:** observation, interpretation, and
action never blur; the count always keeps its denominator; the limitation
sits beside the claim. The report's credibility *is* its layout.

**Failure and recovery states at equal quality.**

- PDF pending: `Download PDF` visible but unavailable with a truthful nearby
  status; web report fully usable.
- PDF failed: the web report is the delivered artifact; the PDF state says so
  honestly and Nuave retries the artifact, never the observations.
- Email delivery failure (owned by Module 06): the report page stays
  authoritative; resend and `Minta bantuan` actions present.
- Correction path: a quiet route to report a problem, per the method section.
- Empty-eligibility dimensions render `Tidak diuji` — never zero performance.

## 8. Report PDF — the artifact

**Emotional job.** *This was worth Rp99.000 — I can forward it to my partner,
my team, or my agency and be taken seriously.*

**Concept.** An A4-native document designed alongside the web report, not
derived as an afterthought: a real cover, running structure, and print-grade
typography rendering exactly the same facts and version.

**Visual and motion vocabulary.**

- Cover: product wordmark, `AI Visibility Report`, business name in the
  report serif, scope, audit date, and the quiet count `4/10` in ink — the
  same hierarchy as the web cover block, recomposed for A4.
- Interior: the five numbered sections with running headers (business +
  report version) and footers (page number + date), hairline rules, generous
  margins, all ten test-by-test entries fully expanded with excerpts and
  sources.
- Ink-first design: readable in grayscale, accent used only where it aids
  scanning, no screen-only affordances (no hover states, no collapsed
  disclosures), no interactive remnants.
- Motion: not applicable. Its stillness is the point.

**Borrows from:** well-made consultancy PDFs and print annual-report
discipline (Apple's environmental reports as a document-craft reference).
**Distinct because:** it is the same report, not an export of a web page —
the recipient who only ever sees the PDF gets the full evidence hierarchy,
the denominators, and the limitation, typeset for paper.

**Failure and recovery states at equal quality.**

- The PDF has no interactive states of its own; its failure surfaces live on
  the web report (`pdf_pending` / `pdf_failed`), always truthful, never
  withholding the validated web report.
- Print fidelity is a first-class acceptance surface: no clipped evidence, no
  factual divergence from the screen, verified page by page.

---

## What this brainstorm deliberately avoids

- Dashboards, scores-over-time charts, monitoring language, and any element
  that implies continuous measurement.
- Percentages, ranks, benchmarks, gauges, or color-coded performance.
- Generic SaaS furniture: gradient blobs, cursor-glow cards, perpetual
  marquees, confetti, fake typing, skeleton screens used as theater.
- Fear, urgency, or hype as a design device — including in failure states.
- Any customer-facing string not routed through the locale catalogs, and any
  paraphrase of a settled label.
