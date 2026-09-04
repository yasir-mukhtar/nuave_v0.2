# Nuave intake binding experience contract (Airbnb rebuild)

> Status: **Binding draft for Founder UX Gate 0** (plan Rev 3, `origin/docs/airbnb-intake-clean-rebuild-plan` @ `483d634`)
> Date: 2026-09-03 · Branch: `feat/airbnb-intake-rebuild`
> Source of truth: `intake-prototype.html` (s-* sections :531-701, `flow()` :878-890, screens.ts order :19-34) — read this session, verbatim.
> Supersedes nothing canonical; sits inside the Gate 0 package next to `docs/drafts/INTAKE_FIXTURES_AND_BUDGETS.md` (screen-count arithmetic §3.1 and fixtures F1-F6 agreed here) and `NUAVE_AIRBNB_INTAKE_PHASE0_CHECKPOINT.md` §6.
> Authority: this ledger, **not** the legacy screen order, defines the new journey controller (plan §3).

## 0. Binding experience invariants (plan §3 — carry every one)

1. One coherent shell across the whole intake; one progress model, one Back action, one primary Continue action.
2. One clear mental question or decision per screen.
3. Customer-language headings; no backend field names, no implementation vocabulary.
4. Read / recognize / confirm **before** edit; typing is a fallback, not the default interaction.
5. Prepared recommendations or choices where evidence supports them.
6. Every drafted answer is correctable.
7. Progressive disclosure: advanced or optional detail never dominates the main path.
8. Calm pacing, predictable transitions, consistent content hierarchy.
9. Mobile is the primary acceptance viewport (single 560px column); desktop stays fully usable (centered column, same composition).
10. The final readback (`s-review`) represents the *meaning* of everything confirmed — never a dump of engine fields.
11. Empty, loading, retry, validation, and recovery states use the same shell and interaction grammar.
12. Provenance and confidence are backend-only, never rendered (VOICE §7.2, DECISION_LOG 2026-09-03).

## 1. Canonical screen order + flow model (controller authority)

All 14 screens, in document order (`screens.ts` is the sequence authority):

```
s-crawl → s-brand → s-brand-fix → s-scope → s-branch → s-product → s-category
  → s-offerings → s-customers → s-market → s-competitors → s-facts
  → s-review → s-questions
```

Post-payment entry (`enterIntake()`): read path enters at `s-crawl` → `s-brand`;
manual path (`mode==='manual'`, no usable source) enters at `s-scope`.

Actual journey graph (prototype `flow()`; * = conditional):

```
s-brand ── Ya, benar ──────────────────────────────┐
   │ Bukan, ganti brand → s-brand-fix → s-crawl → s-brand (re-read, corrected)
s-scope ─┬ brand → s-category
         ├ cabang → s-branch → s-category
         └ produk → s-product → s-category
s-category → s-offerings → s-customers
   → s-market* (skip when scope=produk AND produk ships nationally, i.e. geography immaterial)
   → s-competitors → s-facts* (optional, user-skippable, never journey-skipped)
   → s-review → (Buat pertanyaan audit) → s-questions → (Mulai audit) → audit run
```

Chapter/kicker model (prototype `CHAPTER()`): Bab 0 = s-crawl/s-brand/s-brand-fix
(Brand dan yang Anda tawarkan, no explicit chapter label), Bab 1 = s-scope..s-customers
(Pelanggan Anda), Bab 2 = s-market/s-competitors (Pasar dan pembanding), Bab 3 =
s-facts/s-review/s-questions (Sebelum audit). Four-segment progress bar shows
chapter fill; within a chapter the bar fills fractionally by screen. No chapter
interstitial screens — the kicker does the orientation work (locked decision).

### 1.1 Screen count vs the ≤10 + review budget (matches INTAKE_FIXTURES_AND_BUDGETS §3.1)

| Count | Value |
|---|---|
| Screens in ledger | 14 (`screens.ts`, document order) |
| s-crawl, s-brand-fix | transition/correction overlays — **excluded from budget** |
| s-questions | post-review-confirm, outside the intake screen budget (fixtures budget §3.1) |
| Happy path (scope=brand), content screens before s-review | 8: s-brand, s-scope, s-category, s-offerings, s-customers, s-market, s-competitors, s-facts (+s-review) — s-facts optional but **counts as shown**; it is user-skipped, never journey-skipped |
| Worst normal path | 9 + review: adds exactly one of s-branch / s-product (scope picks at most one); s-market may skip (shipped-product scope), which only reduces |
| Headroom under ≤10 | 1 screen |
| Prototype total incl. question review | 11 post-payment screens — inside the plan §3 Gate 0 cap (≤10 before question review, 11 including it) |

Growth rule: any new screen beyond this ledger requires Yasir's explicit
approval with a stated reason that progressive disclosure cannot absorb
(checkpoint §6, plan §3). No existing screen is removed to buy budget for a
different screen.

### 1.2 Archetype mapping (see §4) and per-screen typing metric

| Screen | Archetype | Happy-path typing | Corrections |
|---|---|---|---|
| s-crawl | system overlay (no archetype) | 0 | — |
| s-brand | A1 confirm | 0 | ≤2 taps |
| s-brand-fix | A4 fallback entry | 0 on happy path (fixes on the 1-in-5 wrong-identity path only) | ≤2 taps + optional text |
| s-scope | A2 choose one | 0 | 1 tap |
| s-branch* | A2 + add | 0 | 1 tap |
| s-product* | A2 + add | 0 | 1 tap |
| s-category | A4 + A2 | 0 | ≤2 taps |
| s-offerings | A3 | 0 | ≤2 taps |
| s-customers | A3 | 0 | ≤2 taps |
| s-market* | A2 + A4 reveal | 0 | ≤2 taps |
| s-competitors | A3 | 0 | ≤2 taps |
| s-facts | A4 fallback | 0 (user taps Lanjut to skip) | ≤2 taps to reach, then free text |
| s-review | A5 | 0 | 1 tap → owning screen |
| s-questions | A5 (post-intake) | 0 | ≤2 taps per wording edit |

Screens where no prepared evidence exists (thin/manual fixtures) present the
same archetype with empty prepared lists and tap-to-add suggestions — never a
blank form first (see per-screen empty states, §3).

## 2. Screen / transition ledger (all 14 screens)

Ledger columns per plan §3: purpose, entry, shown, actions,
validation/blocking, Back, Continue, next/branch, empty/loading/error,
mobile+desktop, deviation-if-any. Every screen shows the shared frame: wordmark,
chapter progress (screens after s-crawl), kicker, sticky bottom bar with
Kembali (ghost, left) and the primary action (right), 44px+ targets, Geist,
zinc tokens per DESIGN.md. Screen `#done` (audit started) is listed as a
terminal state in §3, not as a 15th s-* screen.

### s-crawl — "read before ask" transition

| Field | Value |
|---|---|
| Purpose | System status: tell the owner Nuave is reading the source and preparing its draft before any question is asked. No customer decision. |
| Entry | Post-payment read path start (`enterIntake`); after a same-business correction (`applyBrandFix` → re-read → s-brand). Never part of the linear Lanjut sequence. |
| Shown | Auto-advancing 3-step status list (busy → tick per step): "Membaca <sumber>" (first step text carries the source), "Menemukan produk dan lokasi", "Memperkirakan pelanggan dan pembanding". Static reassurance line: "Semua bisa Anda koreksi. Anda yang paling tahu bisnis Anda." |
| Actions | None. No Back, no Continue (bare screen, own chrome). |
| Validation/blocking | None; steps advance on real extraction state. |
| Back | Not offered (system wait). Refresh/revisit resumes the same preparation job per journey contract (03 module: reload resumes same job, no duplicate work). |
| Continue | Automatic on preparation success → s-brand. |
| Next/branch | Success → s-brand. Failure → inline failure state on this same screen (no new screen): "Coba lagi" (one retry, per `extract: 2` ceiling) and "Isi manual" (→ s-scope manual path). Second failure auto-routes to manual path with a notice; no third retry (fixture F6). |
| Empty/loading/error | Loading = the steps; error = inline notice + two exits (retry / manual), never a dead end, never a success representation (forced-failure rule). |
| Mobile+desktop | Single centered column; steps list, tick spinners. Announce progress via `aria-live="polite"`; `role="status"`. |
| Deviation | **Yes (prototype omission, design work — see §3, item D-1).** The prototype only simulates success on a timer and has no failure/retry states; the real screen must render preparation failure with two forward exits. Not legacy reuse: this state is specified by fixture F6 and the forced-failure pattern. |

### s-brand — confirm the prepared identity (A1 confirm fact)

| Field | Value |
|---|---|
| Purpose | Answer one question: "Is this the brand to audit?" Owner confirms the prepared identity or rejects it. |
| Entry | End of s-crawl read; back from s-brand-fix (after correction, s-crawl re-read returns here); back from s-scope. Manual path never shows this screen. |
| Shown | Brand card: initials mark, name, tagline + URL line. Thin-evidence note when extraction was quiet ("Sumber Anda tidak banyak bercerita…") — a plain sentence, not a badge. Two option cards: "Ya, benar" / "Bukan, ganti brand" (subtitle: "Tunjukkan nama atau sumber yang benar"). |
| Actions | Tap one of the two cards. |
| Validation/blocking | Blocks Continue until explicit "Ya, benar". **Selection is reset on every render** — a wrong card is never silently pre-accepted (ambiguity rule, fixture F4). |
| Back | → previous screen (hidden at journey start). If re-entered after a fix, back → s-crawl. |
| Continue | Primary action "Lanjut" (or the chapter's CTA); enabled only on "Ya, benar" → s-scope. |
| Next/branch | "Ya, benar" → s-scope. "Bukan, ganti brand" → **immediately** s-brand-fix (prototype routes on selection; the mental question is "is this right? no → tell us the right one"). |
| Empty/loading/error | Wrong-identity scenario shows the wrong business card first (deliberate fixture); nothing else changes. No empty state (identity always present post-crawl). |
| Mobile+desktop | Brand card stacks full-width; cards full-bleed rows ≤560px column. |
| Deviation | None. |

### s-brand-fix — correct the identity (A4 fallback entry)

| Field | Value |
|---|---|
| Purpose | Capture the correct brand when the prepared card was the wrong business (or the wrong entity variant). Nothing else is discarded. |
| Entry | Only via s-brand "Bukan, ganti brand" selection. Never reachable from Lanjut. |
| Shown | Heading "Brand mana yang benar?", reassurance lead ("Nuave akan membaca ulang dari sumber ini. Yang sudah Anda isi tidak hilang."), two fields: "Nama brand" (required) and "Situs atau Instagram (opsional)". Kicker "Brand dan yang Anda tawarkan". |
| Actions | Type name; optionally paste corrected source; tap Lanjut. |
| Validation/blocking | Lanjut disabled until name non-empty (live input listener). Source field optional. |
| Back | → s-brand (correction cancelled; original prepared card still shown). |
| Continue | Applies the fix → re-read → s-crawl → s-brand with the corrected card. Prior answers preserved (re-render keeps state; prototype comment + handoff rule). |
| Next/branch | → s-crawl (re-read) → s-brand. A *same-business* correction (name/branch/link) re-reads and continues. An *unrelated-business* correction (owner confirms the originally submitted business is not the audit target) follows the wrong-business remedy in the payment plan — this screen is not the mechanism for switching to a different business. |
| Empty/loading/error | Empty name blocks Continue (above). Error of the re-read surfaces on s-crawl per its failure state. |
| Mobile+desktop | Two stacked text fields; 48px inputs, 16px font (no iOS zoom). |
| Deviation | **None in interaction.** Real-product note (not a deviation): the re-read must re-resolve identity from the corrected source; prototype's "always resolves to sample data" is mock behavior. |

### s-scope — choose what to audit (A2 choose one)

| Field | Value |
|---|---|
| Purpose | Answer: "What should this audit cover?" One scope decision steers the whole journey (branch/product conditionals). |
| Entry | After brand confirmation (read path) or directly post-payment (manual path). Back from s-category/s-branch/s-product. |
| Shown | Kicker "Brand dan yang Anda tawarkan"; heading "Apa yang ingin Anda audit?"; lead "Ini menentukan sudut pandang seluruh audit." Option cards with icon + title + one-line meaning: "Seluruh brand <nama>" (always, description "Semua lokasi dan produk dinilai sebagai satu brand"), "Satu cabang atau lokasi" (**only when branches were found**, "Misalnya hanya satu gerai"), "Satu produk atau layanan" (always, "Misalnya hanya satu lini produk"). |
| Actions | Tap one card (single-select radio group). |
| Validation/blocking | **Blocks Continue until a scope is chosen.** |
| Back | → s-brand (read) / hidden (manual entry). |
| Continue | → s-category for scope=brand; → s-branch for scope=cabang; → s-product for scope=produk. |
| Next/branch | Branch conditional; product conditional; both shown → category. Scope can be changed later from s-review's "Ubah" → returns here; changing it re-scopes later screens and invalidates downstream question pack (materiality rule). |
| Empty/loading/error | Read path: branch option present only when branch data exists (silent conditional). Manual path: no brand card, no branch option (nothing extracted). |
| Mobile+desktop | Full-width cards, icon + two-line text; tap anywhere on card. |
| Deviation | None. |

### s-branch — pick the exact branch/location (A2 choose one + add, conditional *)

| Field | Value |
|---|---|
| Purpose | Resolve a vague "branch" scope into one exact location entity ("never choose silently", 03 journey rule). |
| Entry | Only when scope=cabang. |
| Shown | Kicker; heading "Cabang mana yang ingin diaudit?"; prepared radio rows: branch name + address/area (e.g. "Kopi Sudut Senopati — Jl. Senopati No. 43, Jakarta Selatan"); add-line below: "Cari atau tambah cabang lain" + "Tambah"; hint "Cabang yang belum ada bisa ditambahkan dengan nama dan alamat." |
| Actions | Tap a prepared row; or type + Tambah to add an exact branch not in the list. |
| Validation/blocking | **Blocks Continue until one branch row is selected.** Added rows count once selected. |
| Back | → s-scope (choice preserved). |
| Continue | → s-category. Selected branch becomes the audited entity; later screens (market/customers/competitors) re-scope to it. |
| Next/branch | Only one destination; s-market logic then applies to the chosen location. |
| Empty/loading/error | Zero prepared rows (thin source but user chose cabang): show the add-line only with the same hint (fallback entry, A4 grammar), never a disabled dead screen. |
| Mobile+desktop | Radio rows full-width; add-line = input + outline button in one row. |
| Deviation | None. |

### s-product — pick the exact product/line (A2 choose one + add, conditional *)

| Field | Value |
|---|---|
| Purpose | Resolve a "product" scope into one exact offering line; subsequent questions focus on it. |
| Entry | Only when scope=produk. |
| Shown | Kicker; heading "Produk atau layanan mana?"; prepared radio rows: product name + short context (e.g. "Langganan kopi bulanan — Dikirim ke seluruh Indonesia"); add-line "Cari atau tambah produk lain" + "Tambah"; hint "Pertanyaan tentang pelanggan dan pembanding selanjutnya akan difokuskan ke produk ini." |
| Actions | Tap a prepared row; or type + Tambah. |
| Validation/blocking | **Blocks Continue until one product row is selected.** |
| Back | → s-scope (choice preserved). |
| Continue | → s-category. Product selection feeds the market skip rule (§ s-market, deviation D-2) and later question wording. |
| Next/branch | Single destination; s-market may then be skipped if the product ships nationally. |
| Empty/loading/error | Zero prepared rows (thin source, scope=produk): add-line only, same hint. |
| Mobile+desktop | Radio rows full-width; add-line input+button. |
| Deviation | None. |

### s-category — confirm the category label (A4 + A2 hybrid)

| Field | Value |
|---|---|
| Purpose | Settle the category wording — the phrase the audit's unbranded discovery questions hang on. Must read like what a customer types to an AI, not an internal taxonomy. |
| Entry | After scope resolution (any scope). Back from s-offerings. |
| Shown | Kicker; heading "Bisnis Anda paling tepat disebut apa?"; lead "Pilih sebutan yang mungkin dipakai pelanggan saat bertanya ke AI." Option cards, one per prepared category, each with a customer-style example where available (e.g. "Kedai kopi susu (chain lokal)" → "\"kedai kopi susu enak di Jakarta\""); strongest supported suggestion preselected in read mode; **no preselection when evidence is thin** (manual path starts empty). Add-line "Tulis kategori sendiri" + "Pakai". |
| Actions | Tap one prepared card; or type a better label + "Pakai" (replaces selection). One primary category only. |
| Validation/blocking | **Blocks Continue until a category is chosen** (prepared or typed) — category is one of the three locked blockers (checkpoint §6: brand confirmation, scope, category). |
| Back | → owning scope screen (s-scope / s-branch / s-product) — for a branch/product scope it goes to the entity screen, not past it. |
| Continue | → s-offerings. |
| Next/branch | Single destination. Category label feeds later screens (customers, competitors, questions). |
| Empty/loading/error | No confident category (thin/manual): no preselection; prepared cards shown when the category-conditioned generator produced any, otherwise the add-line leads ("Pilih sebutan…" cards empty → user types; blocking still satisfied only by an explicit choice). |
| Mobile+desktop | Cards full-width with wrapped example line; add-line below. |
| Deviation | **None in intent.** Presentation difference vs the older 03 module description ("chips + free text") is already resolved toward the approved prototype's card+add-line grammar; cards are the read-mode default, typing is the fallback. |

### s-offerings — confirm/add the offering set (A3 choose several + add)

| Field | Value |
|---|---|
| Purpose | Settle what the business offers — the set that shapes customer and competitor questions. Two modes by evidence strength. |
| Entry | After s-category. Back from s-customers. |
| Shown | Kicker; heading + lead switch by mode. **Confirm mode** (rich source): "Ini produk Anda. Sudah benar?" / "Hapus yang salah, tambah yang kurang." — detected offerings shown as pre-on chips, each one-tap removable. **Ask mode** (thin/manual): "Apa saja yang Anda tawarkan?" / "Nuave menemukan N dari sumber Anda. Pilih dari saran di bawah atau tambah sendiri." (or, when none found: "Pilih dari saran di bawah atau tambah sendiri.") — detected chips on, suggestion chips off to tap. Add-line "Tambah produk atau layanan" + "Tambah" in both modes. |
| Actions | Remove a chip (tap X), tap an off suggestion to add, type + Tambah to add a custom item. |
| Validation/blocking | **Does not block** — an empty set is allowed (non-critical gap per contract §8.7; nothing blocks except brand/scope/category + the conditional entity rows). All items remain in the readback. |
| Back | → s-category (set preserved). |
| Continue | → s-customers. |
| Next/branch | Single destination. |
| Empty/loading/error | Confirm mode with zero detected items never occurs (mode derives from detected-count). Ask mode with zero suggestions shows the add-line + lead without a suggestion list (manual fallback fixture F5 is exactly this state; still no dead end). |
| Mobile+desktop | Chips wrap to multiple rows; on-chips dark with X affordance; add-line below. |
| Deviation | None. |

### s-customers — pick the customer situations (A3 choose several + add)

| Field | Value |
|---|---|
| Purpose | Answer: "Why do customers usually look for something like this?" — shapes the situational questions. |
| Entry | After s-offerings. Back from s-market (or from s-competitors when market skipped). |
| Shown | Kicker "Pelanggan Anda"; heading "Kenapa pelanggan biasanya mencari yang seperti ini?" with "Opsional" pill; lead "Hapus yang tidak sesuai, tambah yang kurang. Ini yang membentuk pertanyaan yang akan diuji ke AI." Prepared reason chips (pre-on where evidence supports, off otherwise; e.g. "Ngopi enak dekat kantor", "Tempat nugas atau kerja yang nyaman"); add-line "Tambah sendiri" + "Tambah". |
| Actions | Toggle any chip on/off; type + Tambah for a custom reason (added on). |
| Validation/blocking | **Does not block** (optional). Lead frames pruning as the action, not filling. |
| Back | → s-offerings (selections preserved). |
| Continue | → s-market (unless skipped) else s-competitors. |
| Next/branch | Conditional on market-skip only. |
| Empty/loading/error | No prepared reasons (thin): suggestions still generated by category-conditioned generation where possible; if none, add-line only — still optional, still skippable. |
| Mobile+desktop | Chips wrap; on = filled dark pill. |
| Deviation | None. |

### s-market — where the customers are (A2 choose one + A4 reveal, conditional *)

| Field | Value |
|---|---|
| Purpose | Answer: "Where are your customers?" — only when geography materially affects recommendations. |
| Entry | After s-customers; **skipped** when geography is immaterial (scope=produk and the product ships nationally — rich fixture "Langganan kopi bulanan"/"Biji kopi kemasan 200g"; real test per deviation D-2). |
| Shown | Kicker "Pasar dan pembanding"; heading "Di mana pelanggan Anda berada?"; lead "Ditanyakan karena lokasi memengaruhi rekomendasi untuk bisnis Anda." Four single-select cards: "Sekitar lokasi tertentu" ("Pelanggan datang dari area di sekitar Anda"), "Beberapa kota", "Seluruh Indonesia" ("Misalnya lewat e-commerce atau pengiriman"), "Juga di luar negeri". **Reveal panel** (progressive disclosure) appears only for "Sekitar lokasi tertentu" or "Beberapa kota": "Kota atau area mana?" with prepared city chips (pre-on; tap to remove, add-line "Tambah kota atau area"), then "Pelanggan harus datang ke lokasi Anda?" with two single chips: "Ya, bisnis kami lokal" / "Tidak, kami juga melayani online". |
| Actions | Choose one market card; where revealed, prune/add cities and pick the local-vs-online bound chip. |
| Validation/blocking | **Does not block Continue**; the screen itself is conditional. Reveal state is advisory context, not a blocker. |
| Back | → s-customers (reveal state and choices restored — see deviation D-3). |
| Continue | → s-competitors. |
| Next/branch | Single destination. Cities + bound flag feed the review row and location-aware questions. |
| Empty/loading/error | City set empty (no extraction): reveal shows the add-line only, same hint. Skip state (market not shown) is recorded as `market.shown=false` in the handoff — distinct from "user declined to answer" (intake-handoff data contract). |
| Mobile+desktop | Cards stack; reveal panel indented under a left rule (visual scope); chips wrap. |
| Deviation | **Yes — D-2 trigger (proven technical/data limitation) and D-3 persistence (prototype omission, design work).** See §3. |

### s-competitors — confirm the comparison set (A3 choose several + add)

| Field | Value |
|---|---|
| Purpose | Settle who the audit compares the brand against, or confirm "no direct competitors known". |
| Entry | After s-market (or after s-customers when market skipped). Back from s-facts. |
| Shown | Kicker; heading "Ini yang mungkin dibandingkan dengan Anda"; lead varies by evidence: rich = "Hapus yang tidak relevan, tambah yang kurang."; thin/manual = "Nuave belum menemukan pembanding dari sumber Anda. Ini pembanding yang umum untuk kategori Anda. Hapus yang tidak relevan, tambah yang kurang." (no badge, plain lead). Prepared rows: name + one-line context, each with Hapus; removed rows gray with "Batalkan". Add-line "Tambah pembanding" + "Tambah" (plain text for V1 — entity search deferred, contract §7). Bottom check toggle: "Tidak ada pesaing langsung yang saya tahu". |
| Actions | Remove/restore rows; add a named alternative; toggle the no-competitors check. |
| Validation/blocking | **Does not block.** If the check is on, the readback and the comparison slot use category-level alternatives ("alternatif lain di kategori <kategori>", DECISION_LOG 2026-08-30). |
| Back | → s-market or s-customers (state preserved). |
| Continue | → s-facts. |
| Next/branch | Single destination. Removed suggestions are negative signal — kept in the handoff as `removedSuggestions[]`, never rendered again as options. |
| Empty/loading/error | Empty prepared list (manual): generic category-conditioned rows per fixture; or none at all → lead + add-line + no-competitors check still route forward. |
| Mobile+desktop | Rows full-width; Hapus/Batalkan as compact text buttons; check toggle 44px row. |
| Deviation | None. |

### s-facts — one optional thing Nuave must not misunderstand (A4 fallback, optional)

| Field | Value |
|---|---|
| Purpose | One lightweight optional channel for a material fact that would distort the whole audit if misunderstood. Exactly one section (contract §4). |
| Entry | After s-competitors. Back from s-review. |
| Shown | Kicker "Sebelum audit"; heading "Apa yang tidak boleh salah dipahami tentang brand Anda?" + "Opsional" pill; lead "Satu hal yang, kalau AI salah paham, akan membuat seluruh audit meleset. Satu kalimat cukup." One textarea; helper (placeholder) enumerates safe examples: "Misalnya: keunggulan yang sering terlewat, fakta harga, sertifikasi, istilah khas, atau kesalahpahaman yang sering terjadi." Hint "Boleh dikosongkan." |
| Actions | Type one sentence; or skip (Lanjut). |
| Validation/blocking | **Never blocks.** Sensitive-data stop: if entered text contains personal/sensitive data, stop processing, restrict it, do not forward it, and explain what safe business information is needed (AGENTS.md rule 12; journey 03 failure list). |
| Back | → s-competitors (text preserved). |
| Continue | → s-review. |
| Next/branch | Single destination. Free text crosses to the mapper as `facts.freeText` only if non-empty. |
| Empty/loading/error | Empty = normal state (placeholder carries the guidance). |
| Mobile+desktop | Textarea full-width, min-height 112px, resize vertical. |
| Deviation | None. (VOICE 7.2 register: neutral; no provenance labels on this or any screen.) |

### s-review — final intake readback (A5 readback + corrections)

| Field | Value |
|---|---|
| Purpose | One final editable readback of the *meaning* of everything confirmed, in customer language, before question generation. |
| Entry | After s-facts (or s-competitors when facts skipped by content — s-facts always renders, user may skip instantly). |
| Shown | Kicker "Sebelum audit"; heading "Ini yang akan Nuave audit"; lead "Periksa sekali lagi. Semua bisa diubah." Rows (each: label, value, "Ubah" link back to owning screen): |
| | 1. **Yang diaudit** → s-scope — scope text ("Seluruh brand <nama>" / "Cabang: <nama>" / "Produk: <nama>") + " · kategori: <label>" |
| | 2. **Produk dan layanan** → s-offerings — confirmed offering list or "Belum diisi" |
| | 3. **Kenapa pelanggan mencari** → s-customers — selected situations or "Belum diisi" |
| | 4. **Pasar** → s-market (or s-competitors when market skipped) — "Tidak relevan untuk audit ini. Produk ini dikirim ke seluruh Indonesia." / chosen cities / "Seluruh Indonesia" / "Indonesia dan luar negeri" / "Belum diisi"; reflects the local-vs-online bound chip |
| | 5. **Pembanding** → s-competitors — kept names, or "Tidak ada pesaing langsung. Audit membandingkan dengan alternatif dalam kategori Anda." / "Belum diisi" |
| | 6. **Hal yang wajib benar** → s-facts — the sentence or "Tidak diisi" |
| | 7. **Nama lain dan sumber** (auto-derived, inline) — aliases + source string; "Ubah"/"Selesai" toggles an inline comma-separated edit; helper explains aliases are used to keep the six unbranded questions clean |
| Actions | Tap "Ubah" on any row → that row's owning screen (progressive: alias edit is inline, no navigation). |
| Validation/blocking | Continue ("Buat pertanyaan audit") enabled when all blockers satisfied (they are, by construction, on the forward path; a back-edited row must re-satisfy its screen's blocker). Confirmation is the locked handoff: "Saya sudah memeriksa informasi ini dan menyetujuinya untuk digunakan dalam pertanyaan audit." is the confirmation *state* this screen's Continue represents. |
| Back | → s-facts (all rows preserved). |
| Continue | Primary CTA **"Buat pertanyaan audit"** (VOICE §7.2, intake-handoff lock) → question generation → s-questions. |
| Next/branch | Any material row edit made from this screen → back → change → return: generates a new fact version, supersedes any existing question pack, and forces re-review (journey contract invariant 4, plan §4.5 materiality). |
| Empty/loading/error | Source-conflict variation (fixture F3): one extra advisory row "Perbedaan sumber: <field> — <versi A> vs <versi B>" with Ubah to the owning screen; advisory only, never blocking, backend provenance only. Generation failure on Continue routes to the questions-fallback recovery state (existing 04 module behavior), not a dead end. |
| Mobile+desktop | Rows as stacked label/value with right-aligned Ubah; on desktop same column, no side-by-side table. |
| Deviation | None. |

### s-questions — review the 10 questions before the audit runs (A5, post-intake)

| Field | Value |
|---|---|
| Purpose | Show all ten Indonesian questions in final order before anything runs; the audit starts only from explicit approval of these exact strings. Post-intake (module 04 → 05 boundary), but kept in this ledger because the checkpoint §6 journey inventory includes it and the final CTA lives here. |
| Entry | After s-review Continue ("Buat pertanyaan audit") → question generation → this screen. Back from here returns to s-review only before the audit starts. |
| Shown | Kicker "Sebelum audit"; heading "Periksa pertanyaan audit"; lead "Sepuluh pertanyaan ini akan diuji ke model AI, satu per satu. Ubah kalau ada yang tidak wajar." Two groups with exact settled labels: **Tanpa menyebut bisnis Anda** (6) — "Menguji apakah <brand> muncul dan direkomendasikan dengan sendirinya. Nama brand tidak boleh ada di sini."; **Menyebut bisnis Anda** (4) — "Menguji apa yang model AI katakan saat brand Anda ditanyakan langsung. Hasilnya tidak dihitung sebagai penemuan spontan." Each question card: number · slot intent label (e.g. "Rekomendasi kategori", "Shortlist") + "Ubah" + the question text. |
| Actions | Read; edit wording per question (inline textarea); Save / Escape-cancel. |
| Validation/blocking | Wording edits stay **inside the slot**: slot identity, intent category, declared purpose, unbranded/branded classification, comparison-target policy, and 6/4 composition cannot change (Spec 007 R-10). Empty text reverts to the original wording. **Unbranded guard (locked safety rule):** an edited unbranded question containing the brand name or any alias is refused with a plain message ("Pertanyaan ini tidak boleh menyebut <brand> atau nama lainnya, supaya hasilnya tetap mengukur penemuan spontan.") — the audit measures spontaneous discovery only if no identity leaks. |
| Back | → s-review. Any *material* fact change made via that route invalidates this pack and regenerates (never silently rewrites it). |
| Continue | Primary CTA **"Mulai audit"** (single final CTA, DECISION_LOG 2026-09-03; VOICE §7.3) → atomic audit start (module 05 entitlement consumption; journey contract §05: "Mulai audit sekarang" acceptance language is the same action — reconciliation note below). |
| Next/branch | → audit run state (`#done` in prototype; real: existing audit-run surface with per-question progress — see §3 D-5). Run consumes the entitlement exactly once; repeated start returns one job (idempotency). |
| Empty/loading/error | Generation failure → deterministic Indonesian fallback + questions-fallback recovery (04 module); reload never regenerates a reviewed pack. |
| Mobile+desktop | Question cards stacked, group headers with count at right; edit textarea inline within the card. |
| Deviation | **Copy deviation (C5) and guard-strength note.** Prototype label "Jalankan audit" → **"Mulai audit"** (settled); unbranded guard is a substring match in the prototype, must be contract §8.12-strength screening in product. Reconciliation note: `docs/JOURNEY_CONTRACT.md:30` still reads **"Mulai audit sekarang"** for module 05; the DECISION_LOG/VOICE settlement is **"Mulai audit"** — flag for a one-line doc sync in the same session as the other fixed docs, not a product change. |

## 3. Empty / loading / error / recovery matrix + prototype omissions (design work, never legacy reuse)

Same-shell rule: every state below reuses the journey frame and navigation
grammar. States the prototype does **not** cover are design work for the
fixture skeleton — none of them is permission to reuse a legacy screen.

| State | Screen(s) | Prototype coverage | Binding treatment |
|---|---|---|---|
| Loading (read) | s-crawl | Timer + steps (mock) | Real extraction status; same steps; `aria-live` |
| Loading (post-payment transition) | entry | Static | Real preparation handoff; reload resumes same job |
| Retry | s-crawl | **Omission D-1** | Inline failure + "Coba lagi" (1 retry) + "Isi manual"; 2nd failure auto-routes manual; no third retry (fixture F6) |
| Empty prepared lists | s-branch, s-product, s-offerings (ask), s-customers, s-market cities, s-competitors | Thin scenario shows some; **ask-mode-zero-suggestions shown only in manual fixture** | Same archetype, add-line + lead only; never a blank form first, never a dead end |
| Wrong identity | s-brand → s-brand-fix → s-crawl | Covered (scenario keliru) | Selection reset per render; re-read resolves corrected source; unrelated business → payment-plan remedy |
| Thin source | s-brand note, s-offerings ask-mode, s-competitors lead | Covered (scenario tipis) | Same screens, same archetypes, fewer preselects |
| Manual fallback | entry at s-scope | Covered (scenario manual) | Same screens; category is the only added blocker; aliases "Tidak ada"; source "diisi manual" |
| Source conflict | s-review | **Omission D-4** | Advisory row, backend-only provenance, never blocking (fixture F3) |
| Validation blocked | s-brand, s-scope, s-category, s-branch, s-product | Covered | Lanjut disabled; no error modal; the blocker is stated by the screen's own question |
| Market skipped | s-market skip | Trigger mocked (D-2) | `market.shown=false` recorded distinctly from declined |
| Unbranded question violation | s-questions | Substring guard | §8.12-strength screening; refusal message plain |
| Generation failure | s-review → s-questions | **Not in prototype** | Existing 04 fallback; no dead end |
| Refresh / resume | all | **Not in prototype** | `nuave.audit.intake.v1` per-screen draft, one writer; older parent state cannot overwrite (plan §4.2/4.3) |
| Terminal audit start | `#done` | Prototype overlay | Real audit-run surface (D-5) |

## 4. Closed set of five screen archetypes

Closed: every screen in this ledger maps to one of the five below or is
explicitly listed as an overlay/terminal. **Adding a sixth archetype reopens
Gate 0** (plan). The archetypes are interaction grammar, not components: each
is implemented from prepared data with empty-state behavior (§3), and every
archetype keeps zero free-typing on the happy path and ≤2-tap correction.

| # | Archetype | Behavior contract | Screens |
|---|---|---|---|
| 1 | **Confirm a prepared fact** | Show one prepared statement (brand card) and exactly two verdicts. No "edit" button visible: rejection routes to a purpose-built correction entry. Selection resets each render so nothing is silently accepted. | s-brand |
| 2 | **Choose one prepared option** | Prepared single-select set (cards/rows). Best-supported option may be preselected only with evidence; a vague request must still resolve to an exact entity. Blocks Continue until chosen. | s-scope, s-branch, s-product (+ s-category primary card pick, + s-market market-type pick) |
| 3 | **Choose several prepared options + add** | Prepared multi-select set; items arrive pre-on when supported by evidence, off otherwise; one-tap remove/restore/toggle; one add-line for custom items; optionality may relax blocking; removed suggestions stay as negative signal. | s-offerings, s-customers, s-competitors |
| 4 | **Read first, then reveal edit / free-entry fallback** | The screen reads the owner's content (or the journey reads the source) before asking; free entry and editing sit behind the prepared interaction or in a designated fallback line, never as the default. Covers the correction-entry and one optional free-text channel. | s-brand-fix, s-category add-line, s-market reveal panel, s-facts |
| 5 | **Readback with corrections** | Meaning-level summary rows, each with a correction link to its owning screen (or an inline edit for derived data); edits create a new version and supersede stale downstream artifacts; Continue is the explicit confirmation handoff. | s-review, s-questions (post-intake instance: readback of the 10-question pack with per-slot wording corrections) |

Overlay / terminal, deliberately outside the five (no customer decision):
**s-crawl** (system-status transition; excluded from the screen budget) and the
post-run terminal state. These are governed by §3's state matrix, not by an
archetype.

## 5. Deviation log (each: what / why / invariant preserved + how)

Deviations permitted only for a locked product rule, safety boundary,
accessibility need, or demonstrated technical limitation.

| # | Screen | What differs | Why it must differ | Invariant carried by prototype | How the new treatment preserves it |
|---|---|---|---|---|---|
| D-1 | s-crawl | Real failure/retry/manual states added (prototype has success-only timer) | Preparation failure is a real state; terminal dead ends and silent failure violate the locked recovery pattern (forced-failure spec; journey 03 failure list) | Calm, single-shell states | Failure renders on the same screen, same steps grammar, two forward exits; manual path reuses approved screens (fixture F6) |
| D-2 | s-market | Skip trigger is data-driven ("physical address found, or category in a location-bound set") instead of the prototype's mocked `marketMatters()` (`|| true` fallback) | Proven technical/data limitation: the mock cannot classify a real business; the 03 journey requires geography only when it materially affects recommendations | Progressive disclosure; one decision per screen | The screen still asks exactly one question when shown; `market.shown=false` keeps the "correctly skipped" meaning distinct from a decline |
| D-3 | s-market | Reveal panel (city chips + bound chip) persists in intake state and restores on Back/resume | Prototype omission (design work): the bound chip is not stored, so Back loses it while city chips survive — a correctness hole, not a preference | Every drafted answer correctable; calm predictable transitions | Reveal state joins `IntakeState.market` and rehydrates with the screen (fixture/§3 resume rule) |
| D-4 | s-review | Source-conflict advisory row added | Backend extraction can return conflicting per-source versions; 03 journey lists source conflict as a first-class failure; silent resolution would violate the correction loop | Readback shows meaning; everything correctable | Advisory row with Ubah to the owning screen; never blocks; backend flags only, no visible provenance |
| D-5 | `#done` / audit start | Real audit-run surface replaces the prototype's static overlay | Locked scope: audit execution is downstream keep-list (checkpoint §4), not intake presentation | Terminal state after explicit "Mulai audit" approval | The CTA boundary is identical; the run surface is the existing module 05 UI (never a legacy intake screen) |
| D-6 | s-questions CTA | "Jalankan audit" (prototype) → "Mulai audit" | Founder decision 2026-09-03 (C5): single final CTA label | One explicit run confirmation before the audit | Label change only; the confirmation moment and guard behavior are unchanged |
| D-7 | s-brand-fix re-read | Real re-read resolves identity from the corrected source; unrelated-business switch follows the payment remedy | Locked product rule (03 journey): correction of the same business is allowed; switching to an unrelated business is a remedy path, never a silent intake edit | Read/recognize/confirm before edit; nothing else discarded | s-crawl + s-brand still re-present the resolved card for explicit confirmation; the remedy keeps the original order/evidence linked |

No other deviations. Prototype chrome not carried (not deviations): scenario
select, "simulasi prototipe" notes, mocked QR/payment surfaces — all
out-of-scope p-* or inspection tooling.

## 6. Closed Indonesian copy deck (post-C1/C5, VOICE-conformant)

Voice applied: `Anda`, `brand Anda`, `model AI`, active short sentences, no em
dashes, no provenance/confidence badges, no "Saran Nuave" tags, no
hype/jargon (VOICE §2-§7.2). Data (brand names, product names, cities,
competitor names, question texts, category examples) is fixture content, not
copy — it is never pinned here. Empty/error copy follows each screen's state
matrix (§3); this deck covers visible stable strings only.

### 6.1 Shell / navigation

| String | Location |
|---|---|
| Kembali | Bottom bar, left (ghost link). Hidden only at journey start (s-scope manual entry) and on s-crawl |
| Lanjut | Bottom bar primary action on non-special screens (§6.3 overrides) |
| nuave | Top wordmark |
| (progress: 4 segments) | Chapter fill only; no numerals, no "langkah X dari Y" |

### 6.2 Chapters (kickers)

| Kicker | Screens |
|---|---|
| Brand dan yang Anda tawarkan | s-crawl, s-brand, s-brand-fix, s-scope, s-branch, s-product, s-category, s-offerings |
| Pelanggan Anda | s-customers |
| Pasar dan pembanding | s-market, s-competitors |
| Sebelum audit | s-facts, s-review, s-questions |

### 6.3 Actions (settled CTA set — do not paraphrase)

| String | Screen | Status |
|---|---|---|
| Lanjut | default Continue | generic |
| Buat pertanyaan audit | s-review primary action | **settled** (VOICE §7.2; intake-handoff) |
| Mulai audit | s-questions primary action, final | **settled single final CTA** (DECISION_LOG 2026-09-03, C5) |
| Ubah / Selesai | s-review rows, s-questions per question, alias inline edit | settled generic edit pair |
| Simpan | s-questions inline question edit | generic |
| Hapus / Batalkan | s-competitors rows | generic |
| Tambah | add-lines (s-branch, s-product, s-offerings, s-customers, s-market cities, s-competitors) | generic |
| Pakai | s-category custom-label add | generic |
| Coba lagi / Isi manual | s-crawl failure state (D-1) | locked recovery pair (fixture F6) |

Not in this journey's deck: "Jalankan audit" (superseded by Mulai audit),
"Bayar Rp99.000" / "Cek brand saya" / "Cek bisnis saya di AI" (p-* / landing
register, VOICE §7.1 — out of scope), "Mulai audit sekarang" (module 05
contract wording — sync note in §2 s-questions).

### 6.4 Screen strings

**s-crawl**
- H1: Sebentar, Nuave sedang membaca
- Steps (status, aria-live): Membaca <sumber> · Menemukan produk dan lokasi · Memperkirakan pelanggan dan pembanding
- Reassurance: Semua bisa Anda koreksi. Anda yang paling tahu bisnis Anda.
- Failure (D-1): [Kami belum berhasil membaca <sumber>. Silakan coba sekali lagi, atau lanjutkan dengan mengisi manual.] + Coba lagi / Isi manual

**s-brand**
- H1: Ini brand yang ingin Anda audit?
- Card: <nama> — "<tagline>" · <sumber>
- Thin note (fixture tipis): Sumber Anda tidak banyak bercerita. Nuave mengisi yang bisa diperkirakan dan hanya bertanya yang penting.
- Options: Ya, benar · Bukan, ganti brand (sub: Tunjukkan nama atau sumber yang benar)

**s-brand-fix**
- H1: Brand mana yang benar?
- Lead: Nuave akan membaca ulang dari sumber ini. Yang sudah Anda isi tidak hilang.
- Fields: Nama brand (placeholder) · Situs atau Instagram (opsional) (placeholder)
- Empty-name block: Lanjut disabled (no message needed; field label + placeholder state the need)

**s-scope**
- H1: Apa yang ingin Anda audit?
- Lead: Ini menentukan sudut pandang seluruh audit.
- Options: Seluruh brand <nama> — Semua lokasi dan produk dinilai sebagai satu brand · Satu cabang atau lokasi — Misalnya hanya satu gerai (only when branches exist) · Satu produk atau layanan — Misalnya hanya satu lini produk

**s-branch**
- H1: Cabang mana yang ingin diaudit?
- Add placeholder: Cari atau tambah cabang lain · Hint: Cabang yang belum ada bisa ditambahkan dengan nama dan alamat.

**s-product**
- H1: Produk atau layanan mana?
- Add placeholder: Cari atau tambah produk lain · Hint: Pertanyaan tentang pelanggan dan pembanding selanjutnya akan difokuskan ke produk ini.

**s-category**
- H1: Bisnis Anda paling tepat disebut apa?
- Lead: Pilih sebutan yang mungkin dipakai pelanggan saat bertanya ke AI.
- Add placeholder: Tulis kategori sendiri (button Pakai)

**s-offerings**
- Confirm mode H1: Ini produk Anda. Sudah benar? · Lead: Hapus yang salah, tambah yang kurang.
- Ask mode H1: Apa saja yang Anda tawarkan? · Lead (found N): Nuave menemukan N dari sumber Anda. Pilih dari saran di bawah atau tambah sendiri. · Lead (none): Pilih dari saran di bawah atau tambah sendiri.
- Add placeholder: Tambah produk atau layanan

**s-customers**
- H1: Kenapa pelanggan biasanya mencari yang seperti ini? + pill Opsional
- Lead: Hapus yang tidak sesuai, tambah yang kurang. Ini yang membentuk pertanyaan yang akan diuji ke AI.
- Add placeholder: Tambah sendiri

**s-market**
- H1: Di mana pelanggan Anda berada?
- Lead: Ditanyakan karena lokasi memengaruhi rekomendasi untuk bisnis Anda. Untuk bisnis yang sepenuhnya online, layar ini dilewati.
- Options: Sekitar lokasi tertentu — Pelanggan datang dari area di sekitar Anda · Beberapa kota · Seluruh Indonesia — Misalnya lewat e-commerce atau pengiriman · Juga di luar negeri
- Reveal: Kota atau area mana? (add: Tambah kota atau area) · Pelanggan harus datang ke lokasi Anda? · Ya, bisnis kami lokal · Tidak, kami juga melayani online

**s-competitors**
- H1: Ini yang mungkin dibandingkan dengan Anda
- Lead (rich): Hapus yang tidak relevan, tambah yang kurang.
- Lead (thin/manual): Nuave belum menemukan pembanding dari sumber Anda. Ini pembanding yang umum untuk kategori Anda. Hapus yang tidak relevan, tambah yang kurang.
- Add placeholder: Tambah pembanding · Check: Tidak ada pesaing langsung yang saya tahu

**s-facts**
- H1: Apa yang tidak boleh salah dipahami tentang brand Anda? + pill Opsional
- Lead: Satu hal yang, kalau AI salah paham, akan membuat seluruh audit meleset. Satu kalimat cukup.
- Placeholder: Misalnya: keunggulan yang sering terlewat, fakta harga, sertifikasi, istilah khas, atau kesalahpahaman yang sering terjadi.
- Hint: Boleh dikosongkan.

**s-review**
- H1: Ini yang akan Nuave audit · Lead: Periksa sekali lagi. Semua bisa diubah.
- Row labels: Yang diaudit · Produk dan layanan · Kenapa pelanggan mencari · Pasar · Pembanding · Hal yang wajib benar · Nama lain dan sumber
- Value fallbacks: Belum diisi · Tidak diisi · Tidak ada (aliases) · Tidak ada pesaing langsung. Audit membandingkan dengan alternatif dalam kategori Anda. · Tidak relevan untuk audit ini. Produk ini dikirim ke seluruh Indonesia. · Seluruh Indonesia · Indonesia dan luar negeri
- Alias helper: Nama lain dipakai untuk memastikan enam pertanyaan tanpa menyebut bisnis Anda benar-benar tidak menyebutnya.
- Conflict row (D-4): Perbedaan sumber: <field> — <versi A> vs <versi B>
- Confirmation meaning: Saya sudah memeriksa informasi ini dan menyetujuinya untuk digunakan dalam pertanyaan audit. (handoff state, not a rendered sentence)

**s-questions**
- H1: Periksa pertanyaan audit · Lead: Sepuluh pertanyaan ini akan diuji ke model AI, satu per satu. Ubah kalau ada yang tidak wajar.
- Group labels (exact): Tanpa menyebut bisnis Anda · 6 pertanyaan · Menyebut bisnis Anda · 4 pertanyaan
- Group descriptions: Menguji apakah <brand> muncul dan direkomendasikan dengan sendirinya. Nama brand tidak boleh ada di sini. · Menguji apa yang model AI katakan saat brand Anda ditanyakan langsung. Hasilnya tidak dihitung sebagai penemuan spontan.
- Slot intent labels: Rekomendasi kategori · Situasi pelanggan · Kebutuhan dan pertimbangan · Produk untuk kebutuhan tertentu · Shortlist · Pertimbangan antar pilihan · Kecocokan untuk kebutuhan · Rekomendasi eksplisit · Perbandingan langsung · Cocok, tidak cocok, kelebihan dan kekurangan
- Guard refusal: Pertanyaan ini tidak boleh menyebut <brand> atau nama lainnya, supaya hasilnya tetap mengukur penemuan spontan.
- CTA: Mulai audit

**Terminal (audit started, `#done` equivalent)**
- H1: Audit dimulai · Lead: Nuave sedang menguji bagaimana AI memahami dan merekomendasikan <brand>. Hasilnya siap dalam beberapa menit. (prototype's second sentence is chrome; run surface owns it)

## 7. Mobile + desktop expectations (summary)

- Single column, max-width 560px (`#app`), full-width on small screens; the intake is a mobile-first composition that widens unchanged (no side-by-side desktop re-layout, DESIGN.md responsive rule).
- Bottom sticky nav bar (Kembali | primary) spans the app width and carries safe-area inset; progress bar sits above it. Desktop: same bar centered to the column, never full-bleed controls at 1280px.
- Inputs ≥48px tall with 16px font (no iOS zoom); touch targets ≥44px everywhere (chips, cards, rows, add buttons, check rows); two-layer focus ring on `:focus-visible`; reduced-motion honored (prototype `prefers-reduced-motion` block).
- Transitions: single ease-out curve, 150/250/400ms; screen enters with a short fade/slide; no per-screen animation vocabulary.
- Content hierarchy: kicker (12px caps) → H1 (20/24px) → lead → controls → hint/add-line; one decision per screen keeps the mobile column short; progressive disclosure (s-market reveal, s-brand-fix rejection, review Ubah jumps) keeps detail out of the main path.
- 640px+ only enlarges H1; every behavioral spec above is identical at both viewports.

## 8. Ledger-derived implementation constraints (for the controller)

1. `IntakeJourney` owns the screen graph above — not `AuditWorkflow` (plan §4.1). Screen sequence and conditionals come from this ledger + `screens.ts`.
2. Back restores full per-screen state (selections, reveal state, text, brand-ok reset rule). Forward navigation persists on each transition (`nuave.audit.intake.v1`, one writer).
3. Lanjut disabled-only blockers: s-brand, s-scope, s-category, s-branch, s-product (s-brand-fix via name input). Everything else never blocks.
4. s-market is included in the forward path only when its (D-2) test passes; skip is recorded, not defaulted.
5. s-review rows render from live intake state at every visit; the review value list (§6.4) is the only wording authority for the row labels; data joins are localized to the owning screen's "Ubah".
6. s-questions guard: unbranded wording edits are screened at §8.12 strength; branded slot edits cannot change classification/composition (Spec 007 R-10).
7. Material change from s-review invalidates the question pack and requires regeneration + re-review before "Mulai audit" is ever enabled.
8. Provenance/confidence metadata may be stored and consumed by preparation/review logic but must never render (VOICE §7.2).

## 9. Acceptance check for this contract

- [x] Ledger covers all 14 s-* screens in canonical order with all plan §3 columns.
- [x] Copy deck closed, Indonesian, VOICE-conformant post-C1/C5; CTA set settled; zero provenance badges.
- [x] Archetype set exactly 5, closed, with an explicit overlay/terminal carve-out; screens mapped; adding a 6th reopens Gate 0.
- [x] Screen count 14 total, normal path 8 + review (worst 9 + review), within ≤10 + review; headroom 1.
- [x] Every deviation has what/why/invariant/how and is grounded in a locked rule, safety, a11y, or a demonstrated technical limit.
- [x] Prototype omissions listed as design work (§3), none routed to legacy reuse.
