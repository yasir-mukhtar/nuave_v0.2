# Spec 006: Product-wide design pass (calm instrument)

> Status: **Implementing** (founder-approved 2026-08-20; P0 and P1 shipped
> 2026-08-20, P2–P7 gated on the report-quality gate per the execution plan's
> wave discipline)
> Owner: Founder
> Updated: 2026-08-20
> Implements: Phase 6 (product-wide design and copy pass) of
> `docs/END_TO_END_PLAN.md`; seeds the missing canonical `docs/DESIGN.md`.
>
> Approved by the founder on 2026-08-20. Promoted from
> `docs/drafts/design-pass-2026-08-19/` to `specs/006-product-wide-polish/`
> on 2026-08-20 with the `docs/DECISION_LOG.md` and `docs/NOW.md` updates.

## Required context

Read in order:

1. `AGENTS.md` — contributor rules and the no-commit/no-publish gate.
2. `docs/VOICE.md` — the canonical Indonesian writing contract; settled labels
   are copied verbatim, never paraphrased.
3. `docs/VISION.md` — product principles 1, 2, 3, 8 (evidence first, trust over
   apparent precision, results lead to decisions, simplicity on the customer
   side) and the design guidance under "Guidance for downstream work".
4. `docs/PRODUCT.md` — customer, offer, result reporting contract.
5. `docs/END_TO_END_PLAN.md` — Phase 6 section and the phase table.
6. `docs/JOURNEY_CONTRACT.md` — canonical sequence, module boundaries.
7. `docs/journey/01-order-preview.md` through `06-audit-report.md` — the
   behavioral truth this design serves.
8. `docs/drafts/design-pass-2026-08-19/SCREEN_CONCEPTS.md` — the per-screen
   brainstorm this spec condenses.
9. `docs/drafts/design-pass-2026-08-19/FOUNDER_DECISIONS.md` — the nine settled
   design decisions this spec encodes.
10. Code grounding (read-only): `src/app/page.tsx`, `src/messages/id.json`,
    `src/styles/tokens.css`, `src/styles/landing.css`, `src/app/globals.css`,
    `src/app/audit/AuditWorkflow.tsx`, `src/app/audit/AuditStages.tsx`,
    `src/app/audit/ReportView.tsx`, `src/app/audit/SourceHero.tsx`,
    `src/app/audit/audit.module.css`, `src/app/audit/hero.module.css`,
    `src/app/audit/spec004/`, `src/app/audit/fixture/`,
    `src/components/`.

Do not load: `archive/`, `Archive Candidates/`, superseded plans, or other
drafts.

## Problem

### Observed evidence

The customer-facing surfaces do not yet look, read, or behave like one
Indonesian product, and several live elements contradict canonical rules:

- **Prohibited landing claims.** `src/messages/id.json` (rendered by
  `src/app/page.tsx`) carries "49%" and "90%" problem cards, a stats section
  with "5x Konversi Lebih Tinggi", "67% CLV Lebih Tinggi", "73% Pembelian di
  Kunjungan Pertama", the heading "Jadi yang Pertama Ditemukan di Era Answer
  Engine", and the CTA heading "Siap menjadi jawaban pertama ChatGPT?" — all
  prohibited by `docs/VOICE.md` §3/§7.1 (no ranking, guarantee, unsourced
  statistics, or hype). The copy source `docs/content/landing-copy.md` carries
  the same claims, so the source also needs the excision. The FAQ heading is
  English ("Frequently Asked Questions (FAQ)") and the hero CTA reads "Audit
  bisnis saya" instead of the settled `Cek bisnis saya di AI`.
- **Prohibited concepts in preview mocks.** `src/components/ExampleReport
  Preview.tsx` and `src/components/ReportPagePreview.tsx` show a banded
  "Skor visibilitas: Sedang" with a 55% bar — a normalized/banded score and a
  percentage, both outside the direct-count contract (`docs/PRODUCT.md`).
  `src/components/PaymentPreview.tsx` and `howItWorks.step2Desc` list "kartu
  kredit", which `docs/journey/02-payment.md` excludes. The unused
  `src/components/VisibilityScoreChart.tsx` shows a score rising over time — a
  monitoring implication the product rejects.
- **Broken navigation.** Both hero CTAs are self-anchors (`href="#cta"` on the
  section whose id is `cta`, `src/app/page.tsx`); the nav "Harga" links to
  `/pricing`, which does not exist; nothing anywhere links to `/audit`.
- **Language whiplash.** The live `/audit` shell renders `lang="en"`
  (`src/app/audit/AuditWorkflow.tsx`); live steps 1–3
  (`src/app/audit/AuditStages.tsx`) are English while run-status chips and the
  report are Indonesian; the fixture journey is fully `lang="id"`. The two
  report views diverge in terminology ("Kerjakan dulu" vs "Lakukan lebih
  dulu"; "Pemasaran" vs "Marketing").
- **Two heroes.** `src/app/audit/SourceHero.tsx` (wired into step 0) has a
  perpetual cursor-glow rAF loop, no input normalization (its advertised
  `@instagram_handle` path fails server-side validation), no reduced-motion
  handling, and an unreachable exit animation. `src/app/audit/spec004/
  Spec004Hero.tsx` (unwired) has the parser, detection chip, scan transition,
  and reduced-motion handling — but its demo route `/audit/spec004` spends
  real API budget via `Spec004Demo.tsx`. `src/app/audit/hero.module.css` is a
  528-line dead duplicate of `spec004/spec004.module.css` with zero importers.
- **Two unrelated report designs.** Live `src/app/audit/ReportView.tsx` is
  editorial serif; fixture `src/app/audit/fixture/FixtureReportView.tsx` is
  sans cards. The live report still carries an agency attribution block
  ("Dibuat oleh" + agency logo), contradicting the direct-business customer
  (`docs/PRODUCT.md`).
- **False cost claim.** `BriefStep` (`src/app/audit/AuditStages.tsx`) states
  "This step makes no API call and costs nothing." directly above the button
  that POSTs to `/api/audit/prompts`.
- **Token faults.** The unlayered `--muted` in `src/app/globals.css`
  (near-white surface) overrides HeroUI's layered `--muted` (gray text), and
  `src/app/audit/audit.module.css` consumes `var(--muted)` as a text color in
  roughly ten places; `var(--font-mono)` is used but never defined; Lora is
  loaded in `src/app/layout.tsx` but unused.
- **Missing screens.** The seven payment-status states exist only as settled
  copy in `docs/journey/02-payment.md`; no live or fixture screen renders
  them. The PDF is `window.print()` plus a duplicated print tree, with no
  designed art direction.
- **Accessibility gaps.** `SourceHero` has no reduced-motion path and runs a
  continuous animation loop; at step 0 errors render twice (global alert and
  hero hint).

### Interpretation

None of this is a behavior problem — the journey plans and contracts are
sound. It is a coherence problem: the product was assembled phase by phase
(fixture shell, live tool, landing from the agency era) and never received
the single design and copy pass that Phase 6 exists to provide. The two-hero
duplication, the two report designs, and the token collision all come from
parallel work without a shared foundation. The prohibited landing claims are
the riskiest live defect: they contradict VISION ("sell clarity, evidence,
and useful action — not fear, vanity scores, or guaranteed growth") on a
deployed domain.

## Desired outcome

A reviewer — and later a customer — moves through landing, preview, payment
status, facts, questions, run, and report (web and PDF) and experiences one
calm, precise, Indonesian product. Every screen serves its emotional beat
(discovery → recognition → trust → ownership → anticipation → calm
confidence → insight/action). The design foundation (tokens, typography,
color, spacing, motion rules, component language) exists as one system,
documented well enough to seed the canonical `docs/DESIGN.md`. The landing no
longer carries prohibited claims. One hero exists. One report language
exists. The PDF is a designed artifact with the same facts as the web report.
Accessibility (keyboard completion, visible focus, contrast, reduced motion,
44px targets, mobile parity) is verifiably met on every screen.

## User and situation

The owner or marketing decision-maker of an Indonesian small or medium
business, on a phone or desktop, often arriving from a direct outreach
message. They are not an analyst; they may be paying for professional
software for the first time. Every screen must be completable without
coaching, in natural Indonesian, with honest feedback when anything fails.
Secondary readers: the founder reviewing the fixture journey, and the people
the report is forwarded to (leadership, implementors) who may only ever see
the PDF.

## Scope

1. **The design foundation** — the seed of `docs/DESIGN.md`:
   - token consolidation (canvas, ink, accent, muted semantics, hairlines,
     radii, spacing, shadows) into one source consumed through the Tailwind 4
     theme;
   - deliberate resolution of the `--muted` collision and the undefined
     `--font-mono`;
   - typography: Geist Sans product-wide; a system serif stack reserved for
     report display surfaces; the unused Lora webfont is unloaded
     (founder-approved 2026-08-20);
   - color: `#533afd` as the single action accent; muted semantic colors for
     genuine status only; result numerals always in ink;
   - motion: named duration/easing tokens, beat-bound usage rules, mandatory
     `prefers-reduced-motion` fallbacks, no perpetual motion;
   - accessibility foundations: focus-visible ring, contrast, 44px targets,
     keyboard completion, status announcements;
   - one shared component language (buttons, cards, chips, status banners,
     dialogs, fields, disclosures, provenance pills, the evidence-triad
     block) used by both the live tool and the fixture journey.
2. **All eight customer screens**, per `SCREEN_CONCEPTS.md`: Landing, Order
   Preview, Payment status destination, Business Facts, Questions, Audit Run,
   Audit Report (web), Report PDF.
3. **Hero consolidation**: one hero on the Spec004 interaction model,
   restyled to the foundation; SourceHero and the dead `hero.module.css`
   retired; the spec004 demo route stops spending real API budget.
4. **Landing VOICE-compliance excision**: remove the prohibited claims and
   concepts listed under Problem, ship the interim copy table below, and fix
   the broken navigation.
5. **Report unification and PDF art direction**: one document language across
   live and fixture reports; the A4-native PDF per `SCREEN_CONCEPTS.md` §8.
6. **Bounded dead-code removal**, limited to the set listed under
   Implementation notes.

## Non-scope

- Final landing copywriting and the rewrite of `docs/content/landing-copy.md`
  — a separate approved copy task (this pass ships only the interim copy
  table below and removes prohibited material).
- Any backend or contract behavior change: payment verification, audit
  engine, report content contracts, evidence guardrails, budgets.
- Live journey rewiring beyond the landing intake's destination. The intake
  submits to `/audit` and the access gate is removed (founder-approved
  2026-08-20; see Implementation notes for the exposure prerequisite); the
  live Order Preview flow beyond that entry belongs to its own specification.
- Module 07 (report access and recovery) design.
- Accounts, dashboards, subscriptions, monitoring concepts.
- Content changes to Terms, Privacy, or Support pages (they receive token
  alignment only; the support page's "1–2 hari kerja" response target is
  founder-approved 2026-08-20 and is no longer flagged).
- New heavy dependencies; any dependency addition requires justification
  recorded in the verification record.
- Real payment screens beyond the designed status states (live wiring belongs
  to the Phase 5 payment spec).

## Experience

The full per-screen concepts, references, and failure inventories live in
`SCREEN_CONCEPTS.md`. This section fixes the normative core per screen.

### 1. Landing

One question over one input. Hero H1 `Apakah brand Anda muncul di ChatGPT?`,
subline, the one-field intake (detection chip `Situs web` / `Instagram`,
example chips with fictional `.example` values, reassurance line `Hanya
informasi publik dari situs web atau Instagram resmi.`), primary CTA `Cek
bisnis saya di AI`. One 400ms staggered entrance; the scan-line motif on
submit. Below: how it works, what you receive (with `Ilustrasi`-labeled
preview), boundaries, data policy, FAQ — calm sections, hairline separation,
no nested cards. Removed: stats section, problem-card percentages, marquee,
cursor glow, self-anchor CTAs, `/pricing` link.

**Interim copy table** (VOICE-safe; founder-approved 2026-08-20 via OQ-04.
The separate final-copy task may replace any row):

| Message key | Current (prohibited/off) | Interim replacement |
|---|---|---|
| `cta.auditBrandFree`, `cta.auditBrandFreeNoExclaim` | `Audit bisnis saya` | `Cek bisnis saya di AI` |
| `landing.problemCard1Number` / `…Desc` | `49%` / `pencarian di ChatGPT meminta saran atau informasi` | `Tanya` / `Calon pelanggan kini bertanya langsung ke AI saat mencari rekomendasi.` |
| `landing.problemCard2Number` / `…Desc` | `90%` / `klien B2B menggunakan ChatGPT untuk riset pembelian` | `Jawaban` / `AI tidak hanya menampilkan tautan, tetapi merangkum, membandingkan, dan dapat merekomendasikan satu pilihan.` |
| `landing.statsHeading` + stats section | `Jadi yang Pertama Ditemukan di Era Answer Engine` + 5x/67%/73% | Section removed entirely |
| `landing.ctaHeading` | `Siap menjadi jawaban pertama ChatGPT?` | `Apakah brand Anda muncul di ChatGPT?` |
| `landing.faqHeading` | `Frequently Asked Questions (FAQ)` | `Pertanyaan umum` |
| `report.item2Title` / `…Body` | `Skor visibilitas` / `Supaya ada patokan untuk diperbaiki.` | `Tanpa menyebut bisnis Anda dan Menyebut bisnis Anda` / `Ditampilkan terpisah, masing-masing dengan penyebutnya.` |
| `report.item4Title` / `…Body` | `Daftar kompetitor yang disebutkan` / `Nama kompetitor yang muncul di pertanyaan yang sama.` | `Bisnis lain yang disebut` / `Nama bisnis lain yang muncul di jawaban yang sama.` |
| `howItWorks.step2Desc` | `Pilih saluran pembayaran: QRIS, transfer bank, kartu kredit, atau Gopay.` | `Pilih saluran pembayaran Midtrans: QRIS, transfer bank, GoPay, atau DANA.` |
| `howItWorks.step4Check1` | `Skor AI Visibility` | `Skor kemunculan langsung, misalnya 4/10` |

The example-query chips (`Sepatu lari brand lokal terbaik`, etc.) are
illustrative questions, not claims; they stay. The preview mocks
(`ExampleReportPreview`, `ReportPagePreview`, `PaymentPreview`) are updated
to the same rules: direct count instead of a band, no percentage bar, no card
payment method, and fictional-only product names (replace the real shoe-model
names in the current mock quote).

### 2. Order Preview

Identity card with provenance and a designed "this is not an audit result"
element; three quiet sections; order summary with `Rp99.000`, no additional
tax or fee, 30-day validity, one-audit statement, recipient email with its
three uses, Terms and Privacy links. Upper `Lanjut ke pembayaran` scrolls;
only `Bayar Rp99.000` starts payment. All preview states (loading, partial,
unidentified, unsupported link, quote expired, cancelled/failed return) are
designed states, per `docs/journey/01-order-preview.md`.

### 3. Payment status destination

One stable page answering status, amount, and next action at a glance, for
all seven states with the settled copy of `docs/journey/02-payment.md`:
checking (with prolonged-check fallback to `Cek lagi`), pending (actual
expiry, `Lihat petunjuk pembayaran`, `Saya sudah membayar. Cek lagi.`,
`Pilih cara pembayaran lain`), confirmed (only after server verification;
`Periksa informasi bisnis`), expired (`Buat pembayaran baru`), cancelled
(`Coba lagi`, `Kembali ke ringkasan pesanan`), failed, and temporarily
unavailable (with the explicit do-not-pay-twice guidance and
`Hubungi bantuan`). Muted state tones; masked email; no provider jargon. The
fixture simulator keeps its unmistakable `Simulasi pembayaran — tidak ada
tagihan` treatment in the new visual language.

### 4. Business Facts

The prepared-document pattern per `SCREEN_CONCEPTS.md` §4: reading column,
six provenance pills as a visual system, chips for category and products, one
comparison-business card, conflict callout, the exact confirmation sentence
`Saya sudah memeriksa informasi ini dan menyetujuinya untuk digunakan dalam
pertanyaan audit.`, and the primary action `Buat pertanyaan audit`. No
internal schema terms, no confidence scores, no superlatives. Preparing,
failed-with-manual-entry, conflict, sensitive-text, and refresh-restore
states per `docs/journey/03-business-facts.md`.

### 5. Questions

Reading-first ten-card list per `SCREEN_CONCEPTS.md` §5: numbered cards,
composition chips (`Tanpa menyebut bisnis Anda` / `Menyebut bisnis Anda`)
with live counts, in-place `Ubah` editing with `Simpan pertanyaan` /
`Batalkan` / `Kembalikan saran Nuave`, advisory composition warnings versus
narrow hard stops, the persistent action area (`10 pertanyaan siap
dijalankan`, `Kembali ke informasi bisnis`, `Jalankan audit`), and the
confirmation dialog (`Mulai audit sekarang?`, `Kembali periksa`, `Mulai audit
sekarang`). No fake multi-stage preparing animation; the fallback disclosure
`Kami menyiapkan pertanyaan dasar` when generation cannot tailor the pack.

### 6. Audit Run

The quiet status board per `SCREEN_CONCEPTS.md` §6: completed count as the
hero, elapsed time, the safe-to-close line with masked recipient email, ten
rows with the five settled labels (`Menunggu`, `Sedang diuji`, `Mencoba
kembali`, `Selesai`, `Belum berhasil diuji`), one subtle pulse on the active
row, and state-bound motion only. Retry-exhausted state with `Coba lagi
pertanyaan ini` and `Minta bantuan`; the two report-stage banners
(`Laporan belum berhasil dibuat`, `Kami memerlukan bantuan untuk
menyelesaikan laporan Anda`); the help confirmation `Permintaan bantuan
sudah dikirim`. No provider jargon in the primary hierarchy; no celebration
at 10/10 — the ready state is `Laporan Anda sudah siap`.

### 7. Audit Report (web)

The designed document per `SCREEN_CONCEPTS.md` §7: thin chrome with `Download
PDF`; cover block (`AI Visibility Report` eyebrow, serif business name,
scope, date, recipient); the headline `Bisnis Anda muncul di X dari 10
pertanyaan` with the ink count; `Tanpa menyebut bisnis Anda` and `Menyebut
bisnis Anda` directly beneath with their denominators; `Tidak diuji` for
dimensions without eligible questions; recommendation, comparison, and
public-information measures with assessed denominators; the snapshot
limitation beside the result. Five numbered sections; the evidence triad
`Yang ditemukan` / `Artinya bagi Anda` / `Yang dapat dilakukan` as the
repeating pattern; one to five findings; one to five actions with owner and
completion check; `bisnis lain yang disebut` without ranking; method details
in the collapsed `Tentang audit ini`. The agency attribution block is
removed; internal cost telemetry never appears. One document language unifies
the live and fixture report views, including one terminology set.

### 8. Report PDF

The A4-native artifact per `SCREEN_CONCEPTS.md` §8: cover page, running
headers and footers, page numbers, all ten test entries fully expanded,
grayscale-legible, no interactive remnants, and exactly the same facts and
report version as the web report. PDF pending and failed states surface on
the web report truthfully and never withhold the validated web report.

## Requirements

### Foundation

- **R-01:** One token source. Canvas, ink, accent, muted semantics, hairlines,
  radii, spacing, and shadows are consolidated in `src/styles/tokens.css` and
  surfaced through the Tailwind theme; screen stylesheets consume tokens
  instead of redefining raw hex values. The product ships light-only: the
  dormant `.dark` token set and `@custom-variant dark` are removed
  (founder-approved 2026-08-20).
- **R-02:** The `--muted` collision is resolved deliberately: surface-muted
  and text-muted become distinct, unambiguous tokens; every
  `var(--muted)`-as-text consumer in `audit.module.css` is migrated; the
  undefined `var(--font-mono)` usage is defined or replaced. No screen may
  consume an ambiguous or undefined token after this pass.
- **R-03:** Typography: Geist Sans for all product UI; the system serif stack
  ("Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif) is used
  only for report display surfaces (cover, business name, display result).
  The type scale is documented in the foundation. The unused Lora webfont is
  unloaded in this pass (founder-approved 2026-08-20).
- **R-04:** Color: `#533afd` is the single accent, used for actions and
  active states only. Semantic colors (success, warning, error) are muted and
  used only for genuine status (payment states, `Belum berhasil diuji`,
  `Perlu diperiksa`). The appearance count (`4/10`) and all performance
  numerals render in ink; color never encodes good or bad performance, and
  no percentage, gauge, rank, or benchmark visualization is introduced
  anywhere.
- **R-05:** Motion: named duration tokens (fast ≈150ms, base ≈250ms, slow
  ≈400ms) and one ease-out curve are defined and consumed by all animations.
  No perpetual, looping, or ambient animation remains in any customer-facing
  surface (the logo marquee, cursor-glow loops, and drifting hero gradients
  are removed).
- **R-06:** Every animation and transition has a `prefers-reduced-motion`
  fallback that preserves the state communication; no feature depends on
  motion.
- **R-07:** Accessibility foundation: a visible `focus-visible` ring token;
  contrast of at least 4.5:1 for text and 3:1 for UI components; touch
  targets of at least 44px; every flow completable by keyboard; status
  changes announced through appropriate live regions.
- **R-08:** One shared component language — buttons, cards, chips/pills,
  status banners, dialogs, form fields, disclosures, provenance pills, and
  the evidence-triad block — used by the live tool, the fixture journey, and
  the landing. No per-screen bespoke duplicates of the same primitive.
- **R-09:** All customer-facing strings come from the `next-intl` message
  catalogs and follow `docs/VOICE.md`; no hardcoded customer-facing strings
  in JSX; customer-facing shells declare `lang="id"`. Settled labels are
  never paraphrased.

### Landing

- **R-10:** The hero is the one-field intake pattern (detection chip, example
  chips, reassurance line) consistent with the consolidated hero, with the
  settled CTA `Cek bisnis saya di AI`. The intake submits to `/audit`
  (destination settled by the founder 2026-08-20; the prefill mechanism is an
  implementation detail, and the access gate is removed per the same
  decision — see Implementation notes).
- **R-11:** The prohibited content listed under Problem is removed and
  replaced exactly by the interim copy table above — including the removal of
  the stats section and the correction of preview mocks (no banded score, no
  percentage bar, no card payment method, no real third-party product names).
- **R-12:** Landing motion is limited to the single entrance stagger and
  simple fades; marquee and cursor-glow effects are deleted.
- **R-13:** Every CTA and nav link resolves to a real destination; the
  self-anchor `#cta` loops and the `/pricing` dead link are fixed or removed.
- **R-14:** All illustrative previews keep a visible `Ilustrasi` label and
  contain no real-business or real-product implication.

### Order Preview

- **R-15:** The identity card shows logo or neutral fallback, name, sourced
  description, source with provenance pill, and the `Bukan bisnis Anda?`
  correction path; a designed element states the preview is not an audit
  result; no score, competitor, finding, or recommendation appears before
  payment.
- **R-16:** `Lanjut ke pembayaran` scrolls to the order summary and never
  charges; only `Bayar Rp99.000` starts payment.
- **R-17:** The order summary states `Rp99.000`, no additional tax or fee,
  30-day quote validity, and the one-audit nature; the email field explains
  its three uses; Terms and Privacy links are present.
- **R-18:** Loading, partial preview, unidentified business, unsupported
  link, expired quote, and cancelled/failed-payment return states are
  designed and rendered at equal quality; loading copy never implies an audit
  is running.

### Payment status destination

- **R-19:** One stable destination renders all seven states (checking,
  pending, confirmed, expired, cancelled, failed, temporarily unavailable)
  with the settled `docs/journey/02-payment.md` copy; status, amount, order
  reference, masked recipient email, and one primary action are visible at a
  glance in every state.
- **R-20:** State tones follow the concept: neutral pulse for checking, muted
  amber for pending, one quiet success mark for confirmed, ink-neutral for
  expired/cancelled, sober for failed, neutral for unavailable. The confirmed
  state renders only from verified server state. No raw provider, bank, or
  fraud messages appear.
- **R-21:** Prolonged checking degrades to a manual `Cek lagi` state; the
  temporarily-unavailable state instructs the customer not to pay twice and
  offers `Cek lagi` and `Hubungi bantuan`.
- **R-22:** The fixture payment simulator remains unmistakably simulated
  (`Simulasi pembayaran — tidak ada tagihan`) in the new visual language.

### Business Facts

- **R-23:** The screen renders in Indonesian per `docs/VOICE.md` §7.2, as an
  AI-prepared draft: every prepared value carries one of the six provenance
  labels (`Ditemukan di website`, `Ditemukan di Google Maps`, `Ditemukan di
  Instagram`, `Saran Nuave`, `Ditambahkan oleh Anda`, `Perlu diperiksa`); no
  internal schema terms, confidence scores, or superlatives appear.
- **R-24:** The exact confirmation sentence is present; `Buat pertanyaan
  audit` stays disabled until required fields are complete and the
  confirmation is selected; validation moves focus to the exact field.
- **R-25:** Preparing, failed-with-manual-entry, source-conflict,
  sensitive-text-stop, and refresh-restore states render per
  `docs/journey/03-business-facts.md` at equal quality.

### Questions

- **R-26:** Ten numbered question cards in final order, each with its
  composition chip and an in-place `Ubah` flow (`Simpan pertanyaan`,
  `Batalkan`, `Kembalikan saran Nuave`); reading is the default mode.
- **R-27:** The composition summary (`X Tanpa menyebut bisnis Anda · Y
  Menyebut bisnis Anda · 10 pertanyaan`) updates from final text; coverage
  consequences render as advisory warnings with `Lihat saran Nuave` /
  `Tetap gunakan pertanyaan saya`; only the narrow hard stops of
  `docs/journey/04-questions.md` block approval.
- **R-28:** The persistent action area and the `Mulai audit sekarang?`
  confirmation dialog behave and read exactly as settled (`Jalankan audit`,
  `Kembali periksa`, `Mulai audit sekarang`); the dialog traps focus, and
  Escape closes it.
- **R-29:** Question preparation never shows fake multi-stage progress; the
  fallback disclosure `Kami menyiapkan pertanyaan dasar` appears only when
  generation could not tailor the pack.

### Audit Run

- **R-30:** The run screen shows the completed count, elapsed time, the
  safe-to-close line with the masked recipient email, and ten rows using only
  the five settled labels; the only ambient motion is one subtle pulse on the
  actively-tested row.
- **R-31:** Motion is state-bound: rows, counts, and stage transitions animate
  only on real state changes. No fabricated per-question fills, no progress
  bar beyond the completed count, no fake streaming, and no celebration when
  processing completes — the ready state reads `Laporan Anda sudah siap`.
- **R-32:** The retry-exhausted state (`Coba lagi pertanyaan ini`,
  `Minta bantuan`), both report-stage failure banners, and the
  `Permintaan bantuan sudah dikirim` confirmation render per
  `docs/journey/05-audit-run.md` at equal quality.
- **R-33:** No provider, model, or API terminology appears in the primary
  hierarchy; method details live only in the report's collapsed
  `Tentang audit ini` section, the PDF method note, and the evidence export.

### Audit Report (web)

- **R-34:** One document language unifies the live and fixture report views:
  the serif display surfaces, numbered sections, and hairline-rule system per
  `SCREEN_CONCEPTS.md` §7; the sans-card fixture divergence is retired; the
  agency attribution block is removed; one terminology set is used
  everywhere.
- **R-35:** The result hierarchy is exactly: headline `Bisnis Anda muncul di
  X dari 10 pertanyaan` with the ink count; `Tanpa menyebut bisnis Anda` and
  `Menyebut bisnis Anda` directly beneath with their own denominators;
  `Tidak diuji` for any dimension without eligible questions; recommendation,
  comparison, and public-information measures with assessed denominators; the
  snapshot limitation beside the result.
- **R-36:** The evidence triad (`Yang ditemukan`, `Artinya bagi Anda`, `Yang
  dapat dilakukan`) is visually distinct on every finding and action; one to
  five findings and one to five actions render with evidence references,
  owners, and completion checks; other businesses appear as `bisnis lain
  yang disebut` without ranking or market claims.
- **R-37:** `Download PDF` is the primary action with truthful pending and
  failed states beside it; the evidence export is secondary; a correction
  route per the method section is present; internal cost and provider
  telemetry never appear in the customer UI.
- **R-38:** `lang`, aria labels, and all report strings are Indonesian or
  settled English exceptions (`AI Visibility Report`, `Download PDF`).

### Report PDF

- **R-39:** The PDF is A4-native: cover page, running headers and footers,
  page numbers, all ten test-by-test entries fully expanded, grayscale-
  legible, with no interactive remnants.
- **R-40:** The PDF renders exactly the same report version and facts as the
  web report; page-by-page visual QA shows no clipped, missing, or divergent
  content.

### Cross-cutting

- **R-41:** The fixture journey adopts the same foundation and component
  language as the live tool, so the full path is reviewable end to end in one
  visual language.
- **R-42:** Dead-code removal is bounded to the set listed under
  Implementation notes; nothing outside that set is deleted.
- **R-43:** The spec004 demo route (`/audit/spec004`) no longer issues live
  extraction calls; it is fixture-backed, disabled, or removed, at the
  implementer's smallest-change discretion.
- **R-44:** Hero consolidation: one hero implements the Spec004 interaction
  model (parser, detection chip, scan transition, reduced-motion handling)
  styled on the foundation, wired into step 0 of `/audit`; `SourceHero.tsx`
  and the dead `hero.module.css` are retired.
- **R-45:** No new runtime dependency is added without written justification
  in the verification record.

## Failure and recovery

Design renders every failure state at the same quality as the happy path;
behavior stays owned by the journey plans. Normative summary:

| Surface | Failure states that must exist as designed states | Never |
|---|---|---|
| Landing / intake | Invalid or unsupported link (gentle inline hint, value preserved); unreadable source; ambiguous identity; fixture disabled | Red-block errors; implying an audit started; fabricated identity |
| Order Preview | Loading (never "audit"); partial preview; unidentified business; unsupported link; quote expired; cancelled/failed payment return | Invented logo/description; any audit-result implication; lost email/source on failure |
| Payment status | Checking with prolonged fallback; pending with real expiry; expired; cancelled; failed/denied; temporarily unavailable | Unlocking without server verification; raw provider/fraud messages; a second payment nudge while status is unknown; endless spinners |
| Business Facts | Preparing with recovery; extraction failed → manual fields; source conflict callout; sensitive-text stop; refresh restore | Silent preselection between branches; overwritten customer edits; repeated paid preparation on reload |
| Questions | Honest preparing; deterministic-fallback disclosure; per-card hard-stop errors; advisory composition warnings; fact-change invalidation warning; refresh restore | Fake multi-stage progress; blocking informal-but-allowed questions; silent rewrites of customer text |
| Audit Run | Retrying row; recovery exhausted (`Coba lagi pertanyaan ini`, `Minta bantuan`); report-failure banners; help-sent confirmation; browser-close restore | Fake progress; celebration at 10/10; partial-report implication; provider jargon; rerun of completed questions |
| Report web / PDF | PDF pending and PDF failed beside the locked label; email-delivery failure with resend and help; correction route | Withholding the validated web report for a failed PDF; `0` where eligibility is empty (use `Tidak diuji`); screen/PDF factual divergence |

## Evidence, data, privacy, and cost

- This pass adds no provider call, no data collection, and no analytics. It
  changes presentation and customer-facing copy only.
- The spec004 demo neutralization (R-43) removes a route that currently
  spends real API budget; the completion report must state the accounted-cost
  impact (expected: stops unintended spend).
- All preview and fixture content remains fictional (`.example` sources,
  Kopi Taman Senja); no real business, customer, or product name is used in
  any mock or illustrative element.
- Masked-email display, provenance labeling, and the privacy statements on
  preview and payment surfaces must remain truthful after restyling; raw
  evidence and provider payloads stay out of customer surfaces.
- Customer contact details, payment data, and access secrets remain out of
  everything this pass touches.

## Acceptance criteria

- **AC-01:** Given any customer screen, when its styles are inspected, then
  colors, type, radii, and shadows resolve to the foundation tokens, and no
  screen stylesheet redefines raw hex values outside documented exceptions.
- **AC-02:** Given the migrated stylesheets, when text set in muted color is
  measured, then it meets contrast 4.5:1, and no stylesheet references an
  undefined or ambiguous token (`--muted` ambiguity and `--font-mono`
  resolved).
- **AC-03:** Given the journey code, when customer-facing JSX is searched,
  then no hardcoded customer-facing string remains outside the message
  catalogs, and customer-facing shells declare `lang="id"`.
- **AC-04:** Given the landing source, when `src/messages/id.json`,
  `src/app/page.tsx`, and the preview mocks (`ExampleReportPreview`,
  `ReportPagePreview`, `PaymentPreview`) are searched, then `5x`, `67%`,
  `73%`, `49%`, `90%`, `Pertama Ditemukan`, and `jawaban pertama` are absent,
  the interim copy table is present verbatim, the stats section is gone, and
  the mocks carry no banded score, no percentage bar, no card payment method,
  and no real third-party product names, with every `Ilustrasi` label intact.
- **AC-05:** Given the landing page, when every CTA and nav link is followed,
  then each resolves to a real destination (no self-anchor loop, no
  `/pricing` 404); the intake submits to `/audit`, which is served without
  the access gate; and the exposure pairing required by the implementation
  notes (the approved minimal server-side guard, or the founder's explicit
  interim-exposure acceptance) is in place and recorded in the verification
  record.
- **AC-06:** Given the consolidated hero, when an unusable value is submitted,
  then a gentle inline hint appears and no request is issued; when a usable
  website or Instagram value is submitted, then the scan transition plays
  (or its reduced-motion fallback) and the normalized value is handed to the
  existing extraction path; only one hero implementation exists.
- **AC-07:** Given the order preview in any of its states, when it is
  inspected, then no score, competitor, finding, or recommendation appears;
  `Lanjut ke pembayaran` scrolls without charging; `Bayar Rp99.000` is the
  only payment-starting action.
- **AC-08:** Given the payment-status destination, when each of the seven
  states is rendered, then status, amount, order reference, masked email, and
  exactly one primary action are visible, the settled copy is verbatim, and
  the confirmed state renders only from verified server state.
- **AC-09:** Given the fixture checkout, when viewed, then the simulation
  disclosure (`Simulasi pembayaran — tidak ada tagihan`) is unmistakable in
  the new visual language.
- **AC-10:** Given the business-facts screen, when a prepared draft renders,
  then every prepared value carries a provenance pill, the confirmation
  sentence is exact, and the primary action is gated until requirements are
  met.
- **AC-11:** Given the questions screen, when a question is edited, then the
  composition counts update from the final text, warnings advise without
  blocking allowed edits, and `Mulai audit sekarang` appears only inside the
  confirmation dialog.
- **AC-12:** Given the run screen in live mode, when no state change occurs,
  then nothing on the screen moves; when a question changes state, then only
  the affected row, count, and elapsed time animate; the five settled labels
  are the only row states.
- **AC-13:** Given the web report, when the main result is inspected, then
  the hierarchy of R-35 is present, the agency block and internal telemetry
  are absent, and `Tidak diuji` renders for empty-eligibility dimensions.
- **AC-14:** Given a ready PDF, when compared page by page with the web
  report, then facts, counts, evidence, and actions match exactly and nothing
  is clipped; given a pending or failed PDF, then the web report remains
  delivered with a truthful status beside `Download PDF`.
- **AC-15:** Given the fixture journey, when completed keyboard-only with
  reduced motion enabled, then every screen is reachable and operable, focus
  is always visible, targets are at least 44px, and no information is lost
  without animation.
- **AC-16:** Given both report views, when terminology is compared, then one
  label set is used (no "Kerjakan dulu"/"Lakukan lebih dulu" or
  "Pemasaran"/"Marketing" drift).
- **AC-17:** Given the spec004 demo route, when used, then no live extraction
  call is issued.
- **AC-18 (judgment):** A fresh reviewer completes the fixture journey end to
  end without coaching and correctly identifies what is real and what is
  simulated.
- **AC-19 (judgment):** A non-technical Indonesian reader can read the web
  report in about ten minutes, state the result with its denominator, and
  name one next action — without learning any AEO terminology.
- **AC-20 (judgment):** The founder judges the whole pass to read as one calm
  product: motion reads deliberate and never gimmicky, and the report and PDF
  feel like artifacts worth paying for.

## Open questions

None remain unresolved. The seven questions raised during drafting were put to
the founder and answered on 2026-08-20:

| ID | Question | Resolution |
|---|---|---|
| OQ-01 | Em dash in the payment action label | Label settled as `Saya sudah membayar. Cek lagi.`; `docs/journey/02-payment.md` updated in the same change |
| OQ-02 | Unused Lora webfont | Unload it (R-03) |
| OQ-03 | Report-ready email visual-language ownership | Deferred to Phase 4 (email templates) |
| OQ-04 | Interim landing copy table | Approved as written |
| OQ-05 | Dark mode | Ship light-only; the dormant `.dark` tokens are removed (R-01) |
| OQ-06 | Landing intake destination | The intake submits to `/audit`; the access gate is removed (see Implementation notes for the exposure prerequisite) |
| OQ-07 | Support-page "1–2 hari kerja" response target | Approved as written; no longer a conflict |

The full decision record lives in `FOUNDER_DECISIONS.md` (same folder).

## Implementation notes

- **Token migration order:** introduce the new semantic tokens, migrate
  consumers (landing, audit, fixture stylesheets), then remove superseded
  values. The `--muted` fix is deliberately atomic: define distinct
  surface/text tokens, migrate the ~10 `audit.module.css` consumers, and
  verify contrast in the same change.
- **Hero consolidation mechanics:** `Spec004Hero` already exposes the props
  contract needed for step 0 (minus the never-true `exiting` prop).
  Consolidation = restyle to the foundation, wire into
  `src/app/audit/AuditWorkflow.tsx` step 0, retire `SourceHero.tsx` and
  `src/app/audit/hero.module.css`. Coordinate with the in-flight Spec 004
  implementation: consolidate only after it reaches a verified state, or fold
  this work into its remaining chunk with the founder's explicit handoff.
- **Access-gate removal (founder-approved 2026-08-20).** The landing intake
  submits to `/audit`, and the access gate protecting it is removed in P1.
  Recorded prerequisite: `docs/NOW.md` lists rate limits, cost controls,
  privacy terms, and a correction path as prerequisites for external use,
  because an ungated `/audit` can spend real provider budget. The P1 worker
  prompt must pair the removal with the minimal server-side rate/cost guard
  the founder approves at handoff, unless the founder explicitly accepts the
  interim exposure (the site is noindex and currently shared only by direct
  link). The removal also has a deployment dimension: `NUAVE_ACCESS_CODE` is
  a build-time CI env, and the `/access` page and middleware rule retire
  together; the site-wide noindex posture is unchanged.
- **Report unification:** build the document language once (shared stylesheet
  or shared components) and apply it to both `ReportView.tsx` and
  `FixtureReportView.tsx`; keep the settled label helpers in
  `src/lib/audit/report-labels.ts` as the single terminology source.
- **PDF renderer choice is not made here.** This spec defines the PDF's
  appearance and fact-parity requirements. Whether the artifact is produced
  by the current `window.print()` path or a real generator is a Phase 4
  technical decision; the design must be implementable by either.
- **Bounded removal set (R-42):** `src/app/audit/SourceHero.tsx`;
  `src/app/audit/hero.module.css`; the dead `SourceStep` form in
  `AuditStages.tsx` (dead since the hero replaced it); dead keyframes
  (`heroGlowPulse`, `heroSpin`, `heroExit`, `.stageEnter`);
  `src/components/VisibilityScoreChart.tsx`,
  `PromptResultPreview.tsx`, `RecommendationsPreview.tsx`, and the
  `dashboard/` cluster (unused and embodying prohibited monitoring/banded-
  score concepts); the empty `src/components/ui/` directory. Removal of each
  is justified by the redesign; anything else is preserved.
- **i18n posture:** the catalogs currently ship Indonesian only; this pass
  keeps Indonesian as the customer language and does not invest in an English
  catalog for customer screens.
- **Foundation documentation:** the spec's foundation group (tokens, type,
  color, spacing, motion, components) is written so it can be promoted into
  the canonical `docs/DESIGN.md` at closeout with minimal editing.

## Verification record

- Verification artifact: [`VERIFICATION.md`](./VERIFICATION.md)
- Result: P0 (Foundation) and P1 (Landing) verified 2026-08-20; P2–P7 pending
  (Wave 2 starts after the report-quality gate per `EXECUTION_PLAN.md`)
- Date: 2026-08-20
- Verified commit or working-tree state: working tree of 2026-08-20 (P0+P1
  changes uncommitted; full check/build/unit/e2e evidence in VERIFICATION.md)
