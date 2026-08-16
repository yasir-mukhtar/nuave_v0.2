# Review: Voice and Language candidate (`docs/drafts/VOICE.md`)

Reviewer: independent review session · 2026-08-10
Reference read in order: `AGENTS.md`, `docs/briefs/VOICE.md`, `docs/VISION.md`, `docs/PRODUCT.md`, `docs/AUDIT.md`, `docs/PROMPT_GENERATION_CONTEXT.md`, `src/lib/audit/report-language.ts`.
Result: **Approve after mechanical revision** — 1 high · 6 medium · 6 low. One founder decision (F-02) before the first Indonesian report ships.

## Executive verdict

The candidate is faithful to the approved brief and every parent document. It resolves the brief's open questions, respects its "must not resolve" list (no score formula, field limits, price, or legal terms), and adds no product, measurement, privacy, or commercial decisions of its own. Evidence rules in `AUDIT.md` — exact excerpts, denominators, three layers, failed tests never converted to zero — are carried through without contradiction (criterion 5: no conflicts found). `Anda` usage, sentence case, number formats, and the calm-adviser voice are consistent throughout (criterion 10: strong). The defects are structural: duplicated surface guidance that costs agent context, one direct tension with the runtime contract, and two terminology gaps. Nothing blocks adopting the guide; F-01 should be fixed before agents draft report fields.

## Findings

**F-01 — high — §Mechanics and formatting (435–438) — runtime-contract conflict — orchestrator (mechanical).**
"Treat 25 words as a review signal, not an automatic failure" contradicts `report-language.ts`, which enforces 25 words per sentence as a hard failure in every authored report field; an agent drafting a 28-word finding passes this guide and fails validation. Fix: "Until the Indonesian runtime contract exists, the current runtime limits — including 25 words per sentence — still apply to Nuave-authored report fields; the 12–20 word target and '25 as a review signal' apply only outside those validated fields."

**F-02 — medium — §Preferred customer terminology, "score band" row (236) — terminology — founder decision required.**
`rentang skor visibilitas AI` never acknowledges the canonical artifact name "AI Visibility Score" (`PRODUCT.md`, `AUDIT.md`) and sits in tension with line 221's ban on unexplained `visibilitas AI`. Whether customer copy keeps the English name with an Indonesian gloss or uses a translated name is a product-naming decision. Fix: founder confirms keep-vs-translate before the first Indonesian report; add a gloss note to the row.

**F-03 — medium — §Put meaning in the right order + §Writing by product surface + §Tone table — duplication — orchestrator (mechanical).**
Reports, errors, and outreach guidance appear three times (137–156, 266–373, 379–390) with different examples; avoid-lists repeat the trait sections. The brief's bar is "no longer than needed"; agents pay tokens thrice and may apply variants inconsistently. Fix: one canonical home per surface; the order section becomes a pointer; compress the tone table; one example pair per trait.

**F-04 — medium — §Mechanics and formatting (430–450) — missing guidance — orchestrator (mechanical).**
No rule addresses em dashes in Indonesian copy, though the guide's own §Naturally Indonesian goal depends on it; em dashes read as foreign punctuation and are a classic translation artifact. Fix: add one line — "Avoid em dashes and en dashes in Indonesian customer copy; use a comma, a period, or `sampai`/`hingga`."

**F-05 — medium — terminology table / tone table "fact confirmation" row — missing guidance — orchestrator (mechanical).**
The tone table distinguishes extracted, buyer-supplied, and still-reviewing facts, but no row gives a customer-facing label for buyer-supplied facts or their state, which `PRODUCT.md` step 4 and `AUDIT.md` require ("Label buyer-supplied facts as such until verified"). Fix: add rows — `fakta dari Anda` / `informasi yang Anda berikan`; status `belum diverifikasi`; e.g. `Informasi ini Anda sampaikan dan belum diverifikasi.`

**F-06 — medium — §Evidence and certainty (168–169) — counted-unit consistency — orchestrator (mechanical).**
The prefer-list alternates `pertanyaan yang berhasil diuji` with `Jawaban yang diuji` as the counted unit; `AUDIT.md` counts appearances per answered question, so the blur risks denominator drift. Fix: state once — counts use `pertanyaan yang berhasil diuji`; `jawaban` is reserved for quoted content (`Jawaban yang diuji menyebut…`).

**F-07 — medium — §Score ranges (405–409) — missing guidance — implementation-spec concern.**
The ban on "improvement or decline" without comparable runs is correct, but no positive pattern is given for a comparable re-check ("8 of 10, up from 3 of 10"), which `PRODUCT.md` step 7 will need; without it agents either stay silent on observed change or drift into banned `terbukti meningkatkan`. Fix: add one allowed example, e.g. `Pada pengujian ulang, bisnis muncul dalam 8 dari 10 pertanyaan, naik dari 3 dari 10 pada pengujian sebelumnya` — only under the same method version; word it in the report spec, cross-checked with `AUDIT.md`.

**F-08 — low — §Errors and recovery (344) — naturalness — orchestrator (mechanical).**
`Enam jawaban yang selesai tetap tersimpan di sesi ini.` — "jawaban yang selesai" is awkward and "sesi ini" is mildly technical. Fix: `Enam jawaban yang sudah selesai diuji tetap tersimpan.`

**F-09 — low — §Errors and recovery (345) — naturalness — orchestrator (mechanical).**
`Tinjau hasil yang gagal sebelum mencoba lagi.` — vague and brush-adjacent to the blame language the guide bans. Fix: `Periksa pertanyaan yang belum berhasil diuji sebelum mencoba lagi.`

**F-10 — low — §Keep the three evidence layers visible (209) — naturalness — orchestrator (mechanical).**
`Artinya bagi bisnis Anda` is wordier than its siblings `Yang ditemukan` / `Yang dapat dilakukan`. Fix: `Artinya bagi Anda`, applied symmetrically.

**F-11 — low — terminology table, first row (221) — terminology — orchestrator (mechanical).**
`kemunculan bisnis di AI` is abstract as the category label; the plain-question alternative in the same cell (`apakah bisnis Anda muncul saat orang bertanya kepada AI`) carries the meaning better. Fix: make the plain question primary, the noun phrase a gloss.

**F-12 — low — §Reports (266–284) — missing guidance — orchestrator (mechanical).**
`AUDIT.md` requires the report to show it was "prepared for the ordering business and named recipient"; no Indonesian rendering is given. Fix: add one example, e.g. `Disusun untuk [nama bisnis] — diterima oleh [nama penerima]`.

**F-13 — low — §Customer-style questions (261) — example-scope consistency — orchestrator (mechanical).**
"Illustrative, not a reusable template" is stated only for questions; other example banks have the same status without the caveat. Fix: promote the caveat to one line at the top of §Writing by product surface.

## Sections that should remain unchanged

- Purpose (the four-question framing).
- The voice table and five trait sections (Calm, Specific, Evidence-led, Direct and respectful, Naturally Indonesian).
- §Relationship with the reader: `Anda` rules and the `Nuave` / `audit ini` / `kami` distinction.
- §Preserve exact evidence and the three evidence layers (labels aside from F-10).
- Core terminology rows mapping `muncul`, `disebut`, `direkomendasikan`, `tidak muncul dalam jawaban ini`, `tidak dapat diuji` to `AUDIT.md` definitions.
- §Errors and recovery structure (1-2-3); §Destructive or irreversible actions.
- §Indonesian formats (dates, `Rp`, percentages, thousands/decimals).
- §RASA review for Nuave; §Ownership and maintenance.

## Five strongest Indonesian examples

1. `Samakan jam buka di situs dan profil bisnis. Dua sumber yang diperiksa menampilkan jam yang berbeda.` (Reports)
2. `Bisnis Anda tidak muncul dalam 4 dari 5 pertanyaan tanpa nama bisnis.` (Calm)
3. `Alamat situs belum dapat dibaca. Periksa alamatnya, lalu coba lagi.` (Errors)
4. `Apa pilihan katering untuk acara kantor di Bandung?` (Customer-style questions)
5. `Hapus draf audit? Fakta dan pertanyaan yang belum dijalankan akan dihapus dari sesi ini.` (Destructive actions)

## Five weakest Indonesian examples

1. `Enam jawaban yang selesai tetap tersimpan di sesi ini.` — awkward unit, technical "sesi ini" (F-08).
2. `Tinjau hasil yang gagal sebelum mencoba lagi.` — vague, blame-adjacent (F-09).
3. `rentang skor visibilitas AI` — self-tension with the "avoid unexplained visibilitas AI" row; no acknowledgment of the English artifact name (F-02).
4. `Artinya bagi bisnis Anda` — wordy label next to shorter siblings (F-10).
5. `kemunculan bisnis di AI` — abstract category label; the plain-question alternative is stronger (F-11).

## Opportunities to shorten (without losing operational value)

- Fold the order section's surface subsections into §Writing by product surface; keep the order principle once (est. −40 lines).
- Compress the tone table into a pointer or merge it into the surface sections.
- Trim trait sections to one example pair where avoid-lists restate the same bans.
- Keep the acceptance checklist language-specific; point to `AUDIT.md`'s checklist for the evidence items it repeats.

## Recommendation

**Approve after mechanical revision.** Resolve F-01 before agents draft report fields; route F-02 to the founder before the first Indonesian report; route F-07 to the report implementation spec. All other findings are mechanical and non-blocking.

## Compliance report

- Review file created: `docs/reviews/002-voice-candidate-review.md`.
- Findings by priority: 1 high (F-01) · 6 medium (F-02–F-07) · 6 low (F-08–F-13); 13 total.
- Approval recommendation: approve after mechanical revision; one founder decision (F-02) before the first Indonesian report ships.
- Blocker: none.
- No other file was modified; the candidate and all canonical documents are untouched.
