# Consultant brief: second opinion on Nuave question generation

> Status: **Draft brief for a fresh Astra session**
> Owner: Orchestrator, for founder paste
> Date: 2026-09-06
> Output: a second-opinion memo (not a rewrite, not a spec)
> Pickup in-repo: `docs/drafts/QUESTION_WRITER_FENCE_2026-09-06.md`

Copy everything below the line into the consultant session. Attach Astra 1's
full review if you still have the file. Do not attach secrets or `.env*`.

---

# Second opinion: Nuave natural question generation (2026-09-06)

You are an **independent consultant** in a fresh context. You are not the
builder, not an ally of the in-repo orchestrator, and not bound to agree with
the first Astra review. Your job is a **second opinion** on diagnosis,
sequencing, and what to change next — after new evidence that Astra 1 did
not have.

Write in English. Quote Indonesian only when citing question text.

**Read-only.** Do not modify, create, commit, or push anything. Do not call
any live model or provider. Do not design a 54-pack evaluation apparatus
unless you first argue why the one scored pack is insufficient for the
narrow question being asked.

If you have the repo (`nuave_v0.2`, branch `feat/airbnb-intake-rebuild`):
you may read the files named below. Do not read `archive/` or
`node_modules/`. If you do **not** have the repo, judge from this brief and
the attached Astra 1 review only, and say so.

---

## 1. What we need from you

Answer these. Do not write an implementation plan unless an answer requires
one sentence of sequencing.

1. **Does Astra 1's root diagnosis still hold** now that we have one live
   `question-writer-v2` pack? (The pipeline mixes measure-decision,
   situation, and sentence; fallback is not evidence the writer failed.)
2. **Given the founder's scores, what is the smallest next change** that
   could raise Keep-or-Light without changing what the audit measures?
3. **Which of the founder's Replace marks are product** (slot job is the
   wrong customer question) **versus engine** (right job, bad sentence)?
4. **Pressure-test the orchestrator's fence** (section 6). Where is it
   conservative, where is it wrong, where does it dodge a product call?
5. **What would you tell the founder to decide this week**, in order, with
   no more than three decisions?

**Out of scope:** rewriting `question-writer-v2`, inventing `[[BRAND]]`
tokens, changing the ten-slot matrix, connecting the writer to the new
intake UI, Phase 6B preparation, deployments, live calls.

---

## 2. Product (only what you need)

Nuave sells one paid AI-visibility audit to an Indonesian SMB owner
(Rp99.000). After payment, the owner confirms business facts and a
**ten-question pack**. Nuave then asks an AI those exact strings (with web
search) and reports whether the business appears.

Canonical matrix (locked, Spec 007): **6 unnamed + 4 named**, fixed slot
jobs. Customers may edit wording inside a slot; they cannot change the
slot's job. Deterministic Indonesian templates exist only as fallback so
this stage cannot hard-fail.

The **new intake** (PR #46, `feat/airbnb-intake-rebuild`) currently shows
questions from a **deterministic no-network adapter**. It does **not** call
the live writer. Connecting the writer is a later Phase 6 remainder step.

Production question writer: one bounded **no-search** call,
OpenCode Go / GPT-5.6 Luna, instruction version `question-writer-v2`.

---

## 3. What already happened (do not re-derive)

### Astra 1 (6 September 2026)

Full text (attach if available):
`NUAVE_NATURAL_QUESTION_GENERATION_REVIEW.md`

Astra 1 reviewed the attachment and **default-branch** source. It did
**not** see the in-progress branch, did **not** call a generation model, and
did **not** see founder scores on a live writer pack. Treat its SHAs as
possibly stale versus `feat/airbnb-intake-rebuild`.

**Diagnosis we accepted:**

- The primary problem is not insufficiently casual Indonesian.
- Nuave has not consistently separated the **decision to measure**, the
  **customer's situation**, and the **sentence**.
- Fallback turning measurement labels into customer speech is evidence
  against the templates, not against the separate model writer.
- Phase 6A preview made **no model call** — so that screen could not
  judge the writer.
- Ten different sentences of the same request is not coverage. Score
  customer job + context + requested decision.
- Slot 9 named head-to-head vs category comparison is a **product**
  claim, not a writer trick.
- Related jobs exist (1/5, 2/3, 7/8/10). Distinct measurements do not
  require ten unrelated situations.

**Prescription we staged, not adopted as V1:**

- Brand-anonymous writer input with `[[BRAND]]` / `[[COMPARATOR]]` and
  code-side name insertion.
- Normalized typed context envelope + small style guide + one model call.
- 7 briefs × multiple conditions, up to **54 reviewed packs**, two
  Indonesian-speaking reviewers, 1–5 rubrics, ≥4/5 on several dimensions.

**Astra 1's own Kopi Sudut illustrative draft** (not certified; sparse
context). Proposed consumer category `kedai kopi susu lokal`; no office
anchor; slot 9 as provisional category mode:

1. Kedai kopi susu lokal di Depok yang recommended apa aja?
2. Lagi pengin ngopi di Depok. Ada kedai kopi susu yang bisa dicoba?
3. Kalau cari kopi yang enak di Depok, kedai kopi susu mana yang bisa dipilih?
4. Di Depok, kedai mana yang jual kopi susu?
5. Kalau cuma pilih tiga kedai kopi susu lokal di Depok buat dicoba, apa pilihannya?
6. Bisa bandingin beberapa kedai kopi susu lokal di Depok, terutama soal rasa kopinya?
7. Kalau lagi cari kopi susu yang enak di Depok, Kopi Sudut cocok nggak?
8. Buat ngopi di Depok, kamu rekomendasiin Kopi Sudut nggak?
9. Apa bedanya Kopi Sudut dengan kedai kopi susu lokal lain di Depok?
10. Kopi Sudut di Depok cocok buat siapa, siapa yang lebih baik cari tempat lain, dan apa pertimbangannya?

Astra 1 warned: founder alternatives can **change the measurement**
(branded location lookup in slot 4; “ratingnya bagus nggak?” is not
slot 8; a lone WFH question is not all of slot 10).

### Orchestrator opinion (after Astra 1, before the live pack)

Accepted the diagnosis. Pushed back on:

- `[[BRAND]]` as unproven V1 (extra renderer, leakage tests, no evidence
  it beats projection repair).
- 54-pack / two-reviewer apparatus before seeing **one** real writer pack.
- Treating slot 9 mode typing as an implementation detail.

Recommended sequence: (1) projection + validator repair, (2) measure the
existing writer on a small frozen brief, (3) only then consider tokens /
stronger model / eval apparatus, (4) founder decides slot 9.

Founder: “Fair point. Lets do according to your recommendation.”

### Step 1 (done on this branch, uncommitted)

In `src/lib/audit/questions-id.ts` only — **not** the writer instruction:

- `projectCustomerFacingScope` strips `Cabang:` / `Produk:` / `Brand:`
  (`Depok`, not `Cabang: Depok`).
- Missing-need fallbacks no longer invent `kebutuhan pelanggan` /
  `calon pelanggan`.
- `failsSingleRequestForm` allows one self-contained request without `?`.
- `assertsUnsupportedPremise` is role-aware (desired property allowed;
  asserted property rejected).
- Slot 9 fallback uses a criteria clause when present.

Offline `npm run verify` after Step 1 was green. Do not treat that as
proof of naturalness.

### Founder fence (2026-09-06, SETTLED)

Fix the question engine as a **bounded package** before connecting it to
the new intake. Keep Phase 6B (grounded preparation) separable. Do not
wait for a “stable E2E phase.” Do not halt intake forever.

Do **not**: add `[[BRAND]]`, change the measurement matrix, run a 54-pack
eval, connect `questions-id-provider.ts` to `src/lib/intake/*`, or rewrite
production from one café pack.

Pickup: `docs/drafts/QUESTION_WRITER_FENCE_2026-09-06.md`.

---

## 4. New evidence Astra 1 did not have

Founder authorized **one** live call. Same sparse Kopi Sudut brief.
Provider: OpenCode Go / `gpt-5.6-luna`. Instruction: `question-writer-v2`.
HTTP calls: 1 (965 in / 405 out, ~5.2s). No web search. No second retry.

Minimized brief actually sent:

- brand_name: Kopi Sudut
- scope: Depok
- category: `Kedai kopi susu (chain lokal)` (raw intake label)
- offerings: Kopi Susu Sudut
- customer_needs: `Ngopi enak dekat kantor`
- comparison_business: null
- empty: customer_context, decision_considerations, differentiator,
  conversion_action

Writer source: **model**. Warning: **`slot_safety_repair:9`**.
That means **question 9 on the displayed pack is the deterministic
fallback template, not Luna.** Do not grade the model on Q9.
Mechanical: 0 issues, 0 blockers, 6/4, 0 leaks, 0 unsupported premises.
Fallback pack: also mechanically clean.

### Displayed writer pack

1. Kedai kopi susu apa saja yang bisa ditemukan di Depok?
2. Di mana bisa ngopi enak dekat kantor di Depok?
3. Kedai kopi susu mana yang cocok untuk ngopi enak dan praktis dekat kantor?
4. Di mana bisa membeli kopi susu untuk diminum saat jam kerja di Depok?
5. Kedai kopi susu mana saja yang layak masuk daftar pilihan untuk ngopi dekat kantor?
6. Apa perbedaan kedai kopi susu lokal di Depok untuk kebutuhan ngopi dekat kantor?
7. Apakah Kopi Sudut cocok untuk kebutuhan ngopi enak dekat kantor?
8. Apakah Kopi Sudut direkomendasikan untuk ngopi saat jam kerja?
9. Bandingkan Kopi Sudut dengan alternatif lain di kategori Kedai kopi susu (chain lokal) di Depok?
10. Kopi Sudut cocok untuk siapa, mungkin kurang cocok untuk siapa, dan apa trade-off yang perlu dipertimbangkan?

### Displayed fallback pack (founder: even worse)

1. Rekomendasi Kedai kopi susu (chain lokal) di Depok apa saja?
2. Saya cari Kedai kopi susu (chain lokal) di Depok. Pilihan apa yang bisa dicoba?
3. Untuk Ngopi enak dekat kantor, Kedai kopi susu (chain lokal) apa yang cocok di Depok?
4. Di mana saya bisa menemukan Kopi Susu Sudut di Depok?
5. Pilihan Kedai kopi susu (chain lokal) mana yang layak masuk daftar pertimbangan di Depok?
6. Apa perbedaan pilihan Kedai kopi susu (chain lokal) di Depok?
7. Apakah Kopi Sudut cocok untuk Ngopi enak dekat kantor di Depok?
8. Apakah Kopi Sudut layak direkomendasikan di Depok?
9. Bandingkan Kopi Sudut dengan alternatif lain di kategori Kedai kopi susu (chain lokal) di Depok?
10. Siapa yang cocok memilih Kopi Sudut, siapa yang mungkin kurang cocok, dan apa trade-offnya di Depok?

### Founder scores (buyer bar) — authoritative for this pack

One Indonesian-speaking reviewer (the founder). Buyer pass first.

| Slot | Mark | Founder note (paraphrase + closest rewrite) |
| --- | --- | --- |
| 1 | Light | People would not say “kedai kopi susu”; they say kedai kopi / coffee shop / kafe. Rewrite: `Kedai kopi apa aja yang ada di Depok?` |
| 2 | **Keep** | Only line that already sounds like a person. |
| 3 | Light | `Kafe mana yang kopinya enak dan deket kantor?` |
| 4 | Light | `Di mana bisa beli kopi susu di Depok buat diminum saat kerja?` |
| 5 | **Replace** | `Kafe mana aja yang recommended deket kantor?` |
| 6 | **Replace** | `Bandingin kafe di Depok dari sisi rasa kopinya` — more concise but more specific; is it taste, ambience, service, parking, WFH? |
| 7 | *unmarked* | Leave unscored. |
| 8 | **Replace** | `Bisa pesen delivery Kopi Sudut ke kantor ngga?` — no one would ask whether the coffee is suitable to consume during work hours. |
| 9 | **Replace** | `Bandingin Kopi Sudut dengan kafe-kafe lain di Depok` — not many people care about chain local or not. (Displayed Q9 is the safety-repair template.) |
| 10 | **Replace** | `Saya peminum kopi kasual. Kopi Sudut cocok ngga buat saya?` — people would not overthink ideal segment and trade-offs. |

Keep-or-Light: **4 / 9 scored**. Founder summary: prompts are still forced
and unnatural; fallback is worse.

Orchestrator locked those marks and added: do **not** paste the rewrites
into the model as gold strings. They are the standard (*would a Depok
customer send this?*), not tokens. Q6 and Q8 rewrites may **change the
measurement** (named comparison axis; delivery next-step vs explicit
recommendation). Q9 is not a Luna sample.

Current writer instruction (substance, `questions-id-provider.ts`):

- Write questions plausible Indonesian prospective customers would ask.
- Natural Indonesian; do not translate English templates; slang allowed
  when real customers would use it; do not force slang.
- Exactly ten independent questions in fixed slot order; slot metadata
  is code-owned.
- 6 unnamed, 4 named.
- Prefer the direct question a customer wants answered; vary the
  **customer job**, not merely the wording.
- Unknown public facts may be asked; do not assert them.
- Do not favour the audited business; do not word discovery to reveal it.

Each slot also receives `generatorSlotDescription` from
`measurement-matrix.ts`. Slot 8's job is still **explicit recommendation
of the named business**, not a delivery/next-step question. Slot 10 is
still who it suits / who should look elsewhere / trade-offs.

---

## 5. Open product decisions (do not silently resolve)

1. **Slot 8.** Matrix: “does the model recommend the named business?”
   Founder: buyers ask a next step (delivery). Changing the slot job
   changes the audit.
2. **Slot 9.** Named comparator vs category fallback
   (`alternatif lain di kategori <kategori>`). Category-mode on this pack
   read as staff language. Named-vs-category remains a founder call.
3. **Category labels in customer questions.** Intake stores
   `Kedai kopi susu (chain lokal)`. Mapping to `kafe` / `kedai kopi` is
   semantic product work, not a prompt trick. Astra 1 proposed
   `kedai kopi susu lokal` (keeps “kopi susu”); the founder dropped
   “kopi susu” entirely in Light/Replace rewrites.
4. **Slot 10.** Fit boundaries vs first-person “is this for a casual
   drinker?”

---

## 6. Judgment calls to pressure-test

These are **orchestrator** calls. Argue with them if the evidence warrants.

1. One Kopi Sudut pack is enough to **stop shipping** this writer into
   the new intake, and **not** enough to redesign the matrix.
2. Projection/validator repair first was correct; the live pack still
   failed the buyer bar, so the remaining problem is instruction and/or
   slot jobs, not `Cabang: Depok`.
3. `[[BRAND]]` remains unproven V1 even after this pack.
4. A second Luna call is only worth authorizing after a scrutiny memo
   names one legal instruction change; if Keep-or-Light does not move,
   stop and reopen product — not another rewrite.
5. Connecting live generation at Gate 3 with today's writer **or**
   today's fallback would mix intake defects with question defects.
6. Founder Light/Replace rewrites must not become the instruction's
   few-shot examples without checking slot fidelity (especially 6, 8, 10).

---

## 7. Reading order (if you have the repo)

1. This brief.
2. Astra 1 full review (attachment), especially §§1–3, 8–9, 11.
3. `docs/drafts/QUESTION_WRITER_FENCE_2026-09-06.md`
4. `docs/DECISION_LOG.md` row dated 2026-09-06
5. `INDONESIAN_QUESTION_WRITER_INSTRUCTION` in
   `src/lib/audit/questions-id-provider.ts`
6. Slots 1–10 in `src/lib/audit/measurement-matrix.ts`
7. Step 1 + `repairIndonesianSuggestion` in
   `src/lib/audit/questions-id.ts`
8. `scripts/eval/.results/kopi-sudut-writer-once.json` if present
   (gitignored)

Skip `archive/`, landing copy, and intake UI files unless a claim about
the preview adapter needs a cite.

---

## 8. Output format

1. **One-line verdict** on Astra 1's diagnosis after the live pack.
2. **Agree / qualify / reject** table for Astra 1's main claims
   (diagnosis, `[[BRAND]]` as V1, 54-pack eval, slot 9 product, “measure
   the writer before rewriting”).
3. **Cause table for slots 5, 6, 8, 9, 10** — one of: instruction,
   projection/label, safety-repair, slot job. One sentence why. Q9 must
   account for `slot_safety_repair:9`.
4. **Smallest next change** (one paragraph). If it needs a founder
   product call, say which of the four open decisions, and what default
   you recommend.
5. **Fence verdict:** keep / amend / replace the 2026-09-06 fence.
   Name at most three founder decisions for this week.
6. **What you would not do**, in one short list.

Do not sugarcoat. If the live pack mostly confirms Astra 1, say that and
stop expanding the architecture. If the founder scores imply the matrix
itself will never sound like a first message, say that plainly — that is
a product finding, not a prompt finding.
