# Question-writer fence (2026-09-06)

> Status: **Working pickup note** — not a specification.
> Founder accepted Decision B with fence on 2026-09-06.
> Authoritative row: `docs/DECISION_LOG.md` (2026-09-06).
> Second-opinion consultant prompt (paste to Astra):
> `docs/briefs/QUESTION_WRITER_SECOND_OPINION.md`.
> Do not implement a writer rewrite, `[[BRAND]]` tokens, matrix change, or
> live-writer reconnect from this note. Scrutinize first.

## Why this exists

Chat history is not the handoff. The next agent must pick up the intake
rebuild **and** the question-writer work without re-deriving Astra, Step 1,
or the Kopi Sudut scores.

The fence: **fix the question engine as a bounded package before connecting
it to the new intake.** Keep Phase 6B (grounded preparation) separable.
Do not wait for a “stable E2E phase” to start writer work, and do not halt
the intake rebuild forever.

## Branch and worktree

- Repo: `nuave_v0.2`. Branch: `feat/airbnb-intake-rebuild` (PR #46).
- Phase 6A HEAD: `fe678442987360eb1df718c620a63fc19d0d3eb6` (ahead of
  origin by 1; do not push unless the founder asks).
- Uncommitted when this note was written (do not discard):
  - `src/lib/audit/questions-id.ts` — Step 1 projection + validator repair
  - `src/lib/audit/questions-id.test.ts` — Step 1 regressions
  - `scripts/eval/kopi-sudut-writer-once.ts` — one-shot runner (offline
    verify must never execute it)
  - `.gitignore` — `scripts/eval/.results/`
- Live results are gitignored:
  `scripts/eval/.results/kopi-sudut-writer-once.json`
- No commits or pushes without explicit founder approval.
- `npm run verify` is the canonical **offline** gate. Never use it as a
  live-provider debugger. Leftover `next-server` on port 3000 fails verify
  (`reuseExistingServer: false` in `tests/e2e/shared-config.ts`).

## Intake rebuild (leave it there)

Phases 0–5 done. Gate 2 approved. Phase 6A (offline Review → canonical 6/4
preview) is at `fe67844`. Preview injects a **deterministic no-network**
adapter (`src/lib/intake/question-preview.ts`). It does **not** call
`questions-id-provider.ts`.

Phase 6 remainder (Gate 3) is still the intake track, **after** this writer
package or with the live writer still disconnected:

- grounded preparation after simulated payment
- one preparation job per journey/draft
- versioned sessionStorage + same-session reload
- pending / failure / retry / manual-fallback / stale-state
- brand-correction Ubah loop
- immutable IntakeState → BusinessBrief
- connect existing question generation + explicit audit-start **only after**
  this fence’s pass/fail (or with live generation still disconnected)

Do not mix writer-instruction edits into `src/lib/intake/*`.

## Astra diagnosis (accepted; prescription staged)

Source (outside the repo):
`~/.hermes/attachments/NUAVE_NATURAL_QUESTION_GENERATION_REVIEW.md`

Accepted: the pipeline mixes **measure-decision**, **situation**, and
**sentence** layers. Unnatural output is not “not enough slang.”

Rejected as V1: brand-blinding / `[[BRAND]]` tokens, 54-pack two-reviewer
apparatus, rewriting the writer from one café pack.

Slot 9 named-vs-category is a **product** claim, not a writer trick.

## Step 1 (done, uncommitted)

Repair is in `questions-id.ts`, not the writer instruction.

- `projectCustomerFacingScope` strips `Cabang:` / `Produk:` / `Brand:` so
  customer text gets the geo/offering only (`Depok`, not `Cabang: Depok`).
- Missing-need fallbacks no longer invent `kebutuhan pelanggan` /
  `calon pelanggan`.
- Slot 9 uses `criteriaClause`.
- `failsSingleRequestForm` allows one self-contained request without `?`
  (`Rekomendasiin …`); still rejects multi-request.
- `assertsUnsupportedPremise` is role-aware: desired property
  (`Kedai kopi termurah apa?`) allowed; asserted property
  (`Karena … termurah`) rejected.

Last offline `npm run verify` after Step 1: exit 0 (unit 978; e2e 61 / 15 /
3 / 3). Re-run before treating that as current.

## Kopi Sudut one-shot (2026-09-06)

Authorized by the founder: **one** OpenCode Go / GPT-5.6 Luna call, no
search, founder scores.

- Instruction: `question-writer-v2`
  (`INDONESIAN_QUESTION_INSTRUCTION_VERSION` in `questions-id.ts`;
  text `INDONESIAN_QUESTION_WRITER_INSTRUCTION` in
  `questions-id-provider.ts`)
- Provider: `opencodego` / `gpt-5.6-luna`
- HTTP calls: 1 (965 in / 405 out, ~5.2s)
- Writer source: model
- Warning: `slot_safety_repair:9` — **Q9 is the deterministic fallback
  template, not Luna.** Do not grade the model on that line.
- Mechanical: 0 issues, 0 blockers, 6/4, 0 leaks, 0 unsupported premises
- Fallback pack: mechanically clean, **worse** on naturalness

### Founder scores (buyer bar)

Would a Depok customer send this as a first message?

| Slot | Writer | Mark | Note |
| --- | --- | --- | --- |
| 1 | Kedai kopi susu apa saja yang bisa ditemukan di Depok? | Light | Buyers say kedai kopi / kafe, not kedai kopi susu |
| 2 | Di mana bisa ngopi enak dekat kantor di Depok? | **Keep** | Voice target |
| 3 | Kedai kopi susu mana yang cocok untuk ngopi enak dan praktis dekat kantor? | Light | Same job, staff-speak |
| 4 | Di mana bisa membeli kopi susu untuk diminum saat jam kerja di Depok? | Light | Same job |
| 5 | Kedai kopi susu mana saja yang layak masuk daftar pilihan untuk ngopi dekat kantor? | **Replace** | Same request as 1/3 with extra bureaucracy |
| 6 | Apa perbedaan kedai kopi susu lokal di Depok untuk kebutuhan ngopi dekat kantor? | **Replace** | Asks “difference” with no axis; founder rewrite named taste — that is a **different measurement** |
| 7 | Apakah Kopi Sudut cocok untuk kebutuhan ngopi enak dekat kantor? | *unmarked* | Leave unscored |
| 8 | Apakah Kopi Sudut direkomendasikan untuk ngopi saat jam kerja? | **Replace** | Founder wanted delivery-to-office; slot 8 is “should I recommend this brand?” — **product**, not just copy |
| 9 | Bandingkan Kopi Sudut dengan alternatif lain di kategori Kedai kopi susu (chain lokal) di Depok? | **Replace** | Safety-repair template; “chain lokal” is not buyer speech |
| 10 | Kopi Sudut cocok untuk siapa, mungkin kurang cocok untuk siapa, dan apa trade-off… | **Replace** | Segment/trade-off is analyst talk |

Keep-or-Light: **4 / 9 scored**. Gate for a later round was ≥8/10. **Buyer
bar failed.** Fallback failed harder (`Kedai kopi susu (chain lokal)` in
almost every line).

Do not paste the founder’s Light/Replace rewrites into the model as gold
strings. They are the standard, not the tokens.

## Fence (do / do not)

Do:

- Keep the live writer **disconnected** from `src/lib/intake/*` until this
  package passes a second founder score, or Gate 3 walks with generation
  still disconnected.
- Treat Q2 as the voice target. Treat Q1/Q3/Q4 Light marks as allowed
  wording, not required tokens.
- If an instruction rewrite is later authorized: slots 5/6/8/10 voice
  only; stop stuffing the raw category label into customer sentences.
- One more Kopi Sudut Luna call only with **fresh founder authorization**.
  Same brief, same provider. If Keep-or-Light does not move, stop and
  reopen product (slots 8/9/10) — not another rewrite.

Do not:

- Connect `questions-id-provider.ts` to the new intake from this note
- Add `[[BRAND]]` / brand-blinding
- Change `measurement-matrix.ts` or report semantics
- Run Astra’s 54-pack / two-reviewer apparatus
- Rewrite production from one café pack
- Expand to five clinics or Kopi Taman Senja without authorization
- Commit or push unless asked

## Open product decisions (not writer nits)

1. **Slot 8.** Matrix: explicit recommendation of the named business.
   Founder: buyers ask a next step (e.g. delivery). Do not silently
   replace the slot job with delivery.
2. **Slot 9.** Named comparator vs category fallback
   (`alternatif lain di kategori <kategori>`). Category-mode on this pack
   read as staff language. Named-vs-category remains a founder call.
3. **Category labels in customer questions.** Intake stores
   `Kedai kopi susu (chain lokal)`. Mapping that to `kafe` / `kedai kopi`
   is semantic product work, not a prompt trick.
4. **Slot 10.** Fit boundaries (who it suits / trade-offs) vs a first-person
   “is this for a casual drinker?” question.

## How the next agent scrutinizes (before any rewrite)

Read, in order:

1. This note and the 2026-09-06 `DECISION_LOG.md` row
2. `INDONESIAN_QUESTION_WRITER_INSTRUCTION` in
   `src/lib/audit/questions-id-provider.ts`
3. Slot jobs in `src/lib/audit/measurement-matrix.ts` (orders 1–10)
4. Step 1 code in `src/lib/audit/questions-id.ts`
   (`projectCustomerFacingScope`, fallback templates,
   `failsSingleRequestForm`, `assertsUnsupportedPremise`,
   `repairIndonesianSuggestion`)
5. The scored pack in `scripts/eval/.results/kopi-sudut-writer-once.json`
   if present (gitignored)
6. `docs/PROMPT_GENERATION_CONTEXT.md` and `docs/journey/04-questions.md`
   only as working context — they do not override the fence

Then produce a **scrutiny memo**, not a patch:

- For each of slots 5, 6, 8, 10: is the failure instruction, projection,
  safety-repair, or slot job?
- What one instruction change would be legal under the fence?
- Which failures require a founder product call instead?

Do not edit `INDONESIAN_QUESTION_WRITER_INSTRUCTION` until the founder
accepts that memo.

## Resume Phase 6B

When this writer package has a pass/fail (or the founder parks it), resume
grounded preparation on the intake branch. Owned files stay under
`src/lib/intake/`. Do not reopen Step 1 or this fence unless a Gate 3
walkthrough requires live generation.
