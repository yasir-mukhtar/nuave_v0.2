# Verification: Spec 018 — Real-search questions, answered by ChatGPT and Google (Rp249.000)

> Result: **Fail** (build verification, round 1); **Fail** (round 2, at `1b50615`: see
> [Round 2](#round-2-build-verification-at-1b50615)); **Fail** (round 3, at `727843a`: see
> [Round 3](#round-3-build-verification-at-727843a))
> Reviewer: independent verifier agent (Claude Code, fresh context; did not build the change)
> Date: 2026-10-24
> Spec version or commit: `SPEC.md` revision 8 at `65eb165`, plus the PR 2 worker notes added in `16ced38`
> Implementation version or commit: `8a6180e` on `claude/laughing-fermi-prsgqf` ([PR #151](https://github.com/yasir-mukhtar/nuave_v0.2/pull/151), draft)

## Scope reviewed

- The approved spec (revision 8, including the PR 2 implementation notes), `AGENTS.md`,
  `docs/WORKFLOW.md`, `docs/VOICE.md` and this template.
- The full implementation diff `git diff 65eb165..8a6180e` (105 files):
  - Part 1 (spec "PR 1"): `743279a`..`8cd5703`, plus the fix `cd9c2a3`. Place list, discovery,
    question rules, the discovery route, the questions route, approval, the review field and the
    questions screen.
  - Part 2 (spec "PR 2"): the rest. The ChatGPT and Google checks (`src/lib/checks/`), the
    two-source runner step and gate, the two-source report page and export, the price, promise
    and payment-start check, migrations 0009 and 0010, the founder notices, the verify-nuave
    recipes and the document updates.
- Tests read against each criterion: `discovery.test.ts`, `order-discovery-routes.test.ts`,
  `checks.test.ts`, `two-source.test.ts`, `two-source-report.test.tsx`,
  `runner-worst-case.test.ts`, `spend-worst-case.test.ts`, `payment-routes.test.ts`,
  `smart-intake-contract.test.ts`, the e2e journey driver and the verify-nuave recipes.
- Environments: this sandbox (Node 22.22.0, Chromium 1234 from `/opt/pw-browsers`), synthetic mode
  only. No DataForSEO, OpenAI or Cheaper Inference call was made. GitHub CI on the same head
  was also read.

## Acceptance results

| Criterion | Result | Evidence |
|---|---|---|
| AC-00 | Pass (recorded) | Not re-run (paid). `experiments/dataforseo-sozo/results/probe/SUMMARY.md` (re-run on the revision 6/7 rules): discovery rule 3 of 3 not thin, scraper rule 6 of 6, Google AI Overview with text 4 of 6, USD 0.244. Matches the spec's AC-00 record. The committed `pool-*.json` files hold names and texts only; no phone-like strings found. |
| AC-01 | Pass | `smart-intake-contract.test.ts` "pre-fills Kota untuk pencarian from one clear area and saves it (Spec 018 AC-01, AC-04c)"; `requiredSmartGaps` refuses confirmation without a place; the context schema accepts only a stored-list entry or `Seluruh Indonesia` (`direct-ten-context-v2.ts`, `resolveSearchPlace`); e2e `new-intake-journey.spec.ts:689`. Browser: `rich-preparation/03-summary-after-reload.png` shows "Kota: Bandung" pre-filled from the branch address, with the exact helper text. See N-1 (the lock is not wired). |
| AC-02 | Pass | `two-source.test.ts` whole-path test: every ChatGPT body uses 2360, every Google body 1007715 (Surabaya). `two-source-report.test.tsx` "the page header names both sources and both places": "Google: Surabaya · ChatGPT: Indonesia". The limit note uses the same `placesText` (`DirectTenReportBody.tsx`). The browser runs used Seluruh Indonesia, so they show one place, "Indonesia". |
| AC-03 | Pass | `discovery.test.ts` "turns services into phrases with the six steps" covers every AC-03 example; "never sends the brand and builds a pool in synthetic mode" checks the 10 recorded request bodies; "never sends a request that carries a brand word (R-02)". The live-discovery route test checks the fetch bodies. See N-3. |
| AC-04 | Pass | `discovery.test.ts` R-11 block: exact pool match by origin, topic core words, 7/2 split, brand, and "rejects a label or number changed in the browser". `order-discovery-routes.test.ts` "rejects a label or number changed in the browser, and an edit that drops the place" (approval answers 422). |
| AC-04a | Pass | `discovery.test.ts` R-10/R-10a tests cover Surabaya, Jakarta Barat with "jakarta" and "jakarta selatan", Bekasi, Tangerang Selatan, Padang Panjang, "Bagaimana…", "Berapa lama…" and the place-only advice case. The route test blocks an edit that drops the place, with "Sebutkan kota Surabaya di pertanyaan ini." Seluruh Indonesia has no repo test; checked independently: a pack naming "Surabaya" or using "terdekat" is rejected, a plain pack passes. The on-screen message comes from `SmartQuestionsScreen.tsx` (code read; no browser test). |
| AC-04b | Pass | `discovery.test.ts` pool test: "wonder dental spesialis implan gigi surabaya" dropped, seen names give `["wonder"]`, a navigational "klinik implan gigi terdekat" stays a topic, a topic returned twice counts once. Checked independently: "v shape bra", "obat nyeri lutut" and "icd 10 nyeri lutut" are not relevant; "klinik kecantikan laser terdekat" marked navigational stays usable. |
| AC-04c | Pass | `discovery.test.ts` R-03 tests: Jakarta Selatan gives 9072592, DKI Jakarta gives 1007716, Depok pre-fills nothing and shows three distinct labels, Tangerang Selatan stays Tangerang Selatan. See N-8. |
| AC-05 | **Fail** | The basic case passes (`order-discovery-routes.test.ts` "falls back to the business facts when discovery found nothing (AC-05)"; `two-source-report.test.tsx` "says once…"). But when the customer edits any question in a fallback pack, `search_data_available` becomes true (`src/lib/orders/two-source.ts:260-262`). The report then drops the R-08 sentence and states "Pertanyaan diambil dari data pencarian Google melalui DataForSEO, seluruh Indonesia." Reproduced with the real `buildTwoSourceReport` and `TwoSourceMethod`. B-3. |
| AC-06 | Pass | `two-source.test.ts` whole-path test: run 1 asks `chatgpt:1` and `google:1` together; every `body.keyword` equals the approved text; retries ask `google:3` alone and `chatgpt:7` alone; a completed answer is asked once. |
| AC-07 | Pass | `two-source.test.ts` (question 3 empty twice gives `not_shown` with empty text); `checks.test.ts` "no AI Overview, or status 40102, is a completed 'not shown'; an empty element is retried". Browser: two `[data-not-shown]` in the saved report. |
| AC-08 | Pass | `checks.test.ts` "named is decided by code (R-16, AC-08)" (two tests). Checked independently: a name only in the sources list or only in a link address gives `source_only`; the name as link text, or an alias in the text, gives `named`. See N-9. |
| AC-09 | Pass | Checked independently through the real runner (synthetic mode, sqlite D1) with Google failing on questions 2 and 9 and the synthetic ChatGPT failure on 7. The order is delivered with N = 9, M = 8 and K = 3. There are three `[data-failed-slot]`, each with a "Minta bantuan" mailto to support@nuave.ai naming the order. Exactly one `checks_failed` notice lists "pertanyaan 2 Google, pertanyaan 7 ChatGPT, pertanyaan 9 Google". The repo covers it in two parts: `two-source-report.test.tsx` (rendering) and `two-source.test.ts` (one failure). |
| AC-10 | Pass | `two-source.test.ts` "AC-10: with 6 failed ChatGPT checks no report is made…": the state is `failed` with `checks_below_gate`, no report, one `paid_order_failed`, the failure email sent and no `checks_failed`. |
| AC-11 | Pass, with notes | Per-source denominators, the D-05 sentences word for word, "Tidak diuji" instead of "0 dari 0", the R-18 rows and the Google finding: `two-source-report.test.tsx`, `two-source.test.ts` and the screenshots. Each question's topic line says "±N pencarian/bulan di Google, seluruh Indonesia (data September 2026)". No AI-assistant estimate appears. See N-2 (the R-18 rows give the number without "seluruh Indonesia") and B-2 (the written conclusion can contradict the cards). |
| AC-12 | Pass | `two-source.test.ts` AC-12 part checks the stored ChatGPT and Google results, the saved report, the report-model input and the export: none holds the synthetic phone numbers or raw DataForSEO keys. I checked the export the browser downloaded (`report-link/download-evidence.json`): no phone number, no raw keys and no email. See N-5. |
| AC-13 | Pass | `payment-routes.test.ts` "Spec 018 R-22/AC-13: refuses a payment while DataForSEO is unavailable…" (503 with "Audit tidak tersedia saat ini.", one notice per day, accepted again once the check passes). `two-source.test.ts` AC-13 tests: 40210 and 40100 are not retried and raise one notice; 50301 is retried; past the order hold no call is sent. `discovery.test.ts`: an unknown code is not retried. `checks.test.ts`: the USD 2.00 threshold and the 10-minute cache. |
| AC-14 | Not verified | The founder's live run (out of scope here). |
| AC-15 | **Fail** | The runner part passes: `runner-worst-case.test.ts` "one step asks both sources and fits; two orders running at once each take one step in the same run". A two-source step measures 23 units; `RUN_UNIT_LIMIT` is 80, which R-15 allows under Workers Paid. The other two clauses fail. Nothing tests that a discovery request stays under 50 subrequests; I measured 32 normally and **62** when every call is retried once. `spend-worst-case.test.ts` counts question writing as zero; with it, the worst case passes USD 2.00. B-1. |
| AC-16 | Pass, with note | verify-nuave run `20261024T061016Z-nk1n`: `doctor` all PASS (clean tree at `8a6180e`, synthetic). `drive all`: 5 of 6 passed first time; `audit-run` failed once on a race in the driver (N-11) and passed on re-run. `capture`: 6 passed, 0 unexpected external requests, 114 files. `cleanup`: group stopped, port free. Each run includes an empty AI Overview (question 3), no AI Overview (question 5) and a failed ChatGPT check (question 7). |
| AC-17 | Partial (founder) | Checkout (`report-link/03-order-summary.aria.yml`) shows "Diperiksa di ChatGPT dan Google AI Overview", "Total Rp249.000", "Bayar Rp249.000" and the R-23 proposal. The steps screen also names both sources. Midtrans gets `gross_amount` 249000 (`midtrans.test.ts`, `payment-routes.test.ts`). A grep finds no Rp99.000 in `src/`, the emails, the PDF or the skill. Price, promise and checks ship in one PR. Still open: the founder's approval of the exact R-23 words (Q-1). |
| AC-18 | Pass | `two-source-report.test.tsx` AC-18 snapshots. Checked independently: the same two snapshots also pass against the **base** renderer at `65eb165` (tree extracted with `git archive`, `CI=true`, snapshot file unchanged, sha256 `648eeffa…`). The old and new renderers produce identical markup for a report saved before Spec 018. |
| AC-19 | Pass | `discovery.test.ts` "marks edits and keeps the number only with the topic words (AC-19)"; route test "marks an edit Diubah oleh Anda…". Browser: `question-review/02-question-1-edited` and the saved report show "Diubah oleh Anda" and "Topik awal: harga kopi susu · Tidak ada data jumlah pencarian". |

## Requirements trace

Requirements without their own criterion, checked by reading the code and, where noted, by running it:

- **Met:** R-01, R-04, R-04a, R-05, R-05a, R-05b (navigational intent kept, revision 8), R-06,
  R-10, R-10a, R-11, R-12, R-13, R-14, R-17, R-19, R-20, R-21, R-22, R-26, R-27, R-29.
  - The Report layout rows for the header, "Hasil singkat", the answers section,
    "Topik yang belum menyebut Anda" and "Tentang audit ini" are met.
  - Migrations 0009 and 0010 only add nullable or defaulted columns.
- **Not met or partly met:**
  - R-09: the hard stop can be passed (B-1).
  - R-25: the worst case is not shown (B-1).
  - Report layout, "Findings name the source they come from": not met. R-28's list of what the
    report prompt receives is also not followed (B-2).
  - R-07 / Experience 2: the field does not lock after the second discovery run (N-1).
  - R-11a: the new checks do not run in `report-pipeline.ts` (N-4).
  - R-02 / R-04a: brand words now skip every place-list word (N-3).
  - Report layout, "one list per source, taken from the answer text": the Google list is derived
    from ChatGPT's names (N-6).
  - R-21: discovery-time refusals raise no `dataforseo_unavailable` notice (N-7).
- **Extra behaviour:**
  - `RUN_UNIT_LIMIT` 40 → 80. R-15 allows it under Workers Paid, which the decision log
    records as production's plan (Q-4).
  - Synthetic retries skip the back-off.
  - Payment start also refuses when DataForSEO cannot be reached (it fails closed, with no notice).
  - The builder added three "Built in PR 2 (worker notes)" bullets to `SPEC.md`. Two of them
    are inaccurate: "about USD 1.82 per order at worst" (B-1) and "the report-writing model
    reads … their code-decided facts" (B-2).

## Judgment review

- **Customer comprehension and layout** (screenshots `question-review/06-report-by-link.png`,
  `report-link/11-report-by-link.png`, `report-a4.headless.pdf`, 15 pages):
  - The structure matches the spec's Report layout table:
    - two stacked source cards with their own denominators;
    - one block per question, with the label, the topic line and both answers stacked (no tabs);
    - the PDF shows everything;
    - "Tidak dapat diuji" with "Minta bantuan" in the failed slot;
    - "Google tidak menampilkan AI Overview";
    - the code-built Google finding, "Bisnis lain yang disebut" per source, "Topik yang belum
      menyebut Anda" and the method bullets.
  - Defects:
    - The written conclusion sits right under both cards. In the synthetic report it says
      "Kedai Fiksi tidak disebut dalam jawaban sintetis mana pun", while the Google card above
      it says "Bisnis Anda muncul di 3 dari 8 pertanyaan" (B-2).
    - The method paragraph reports only the ChatGPT count ("9 dari 10 pertanyaan selesai diuji;
      1 pertanyaan tidak dapat diuji") and uses the internal system label (N-10).
- **Overclaiming:**
  - "Diperiksa di ChatGPT dan Google AI Overview" is accurate on the order card, the steps
    screen and the report header: both sources are asked, and Google often showing no
    AI Overview is reported as a finding (Q-3).
  - The name "Google AI Overview" is used consistently.
  - The topic lines say "seluruh Indonesia" with the data month.
  - Overclaims found:
    - the false "Pertanyaan diambil dari data pencarian Google…" line (B-3);
    - the R-18 rows give a national number without saying so (N-2);
    - "Tentang audit ini" calls the question source "seluruh Indonesia" even when the wordings
      came from the city's Google results (N-16).
- **Privacy:**
  - No phone numbers or raw DataForSEO responses reach the saved report, the report-model
    input, the browser's report data or the export: tests, plus the downloaded export.
  - The discovery route returns only `{status, searchData, locked}`; the pool and the seen
    business names stay on the server.
  - The edge case is phone numbers inside cited URLs (N-5).
  - The privacy page naming DataForSEO is S5's job before G1.
- **Spend guard:**
  - Every DataForSEO call reserves before it is sent and settles to the returned cost. Nothing
    is sent past the order hold or the daily cap (tests).
  - The design's worst case is not proven within USD 2.00 (B-1).
- **Old reports:** they render unchanged (AC-18, checked against the base renderer).
- **Price:** Rp249.000 / 249000 everywhere it is shown or charged: code, emails, Midtrans,
  the fake Midtrans default, the landing and FAQ figures, the verify-nuave skill and the docs.
  The older planning content under `docs/content/` still says Rp99.000; S5/S6 own those pages.
- **Language:**
  - The new Indonesian strings match `VOICE.md` §7.3/§7.4 as updated.
  - The helper text is exact.
  - The R-23 promise is the spec's proposal and waits for the founder (Q-1).

## Checks run

| Check | Result |
|---|---|
| `npm ci` | Not needed: `package.json` and `package-lock.json` are unchanged in the diff, and `npm ls --all` exits 0. |
| `npm run check` | Exit 0. Typecheck, lint (0 errors, 24 warnings, all present at the base too), format and typography all pass. |
| `npm run test:unit` | Exit 0. 137 files, 2,469 tests passed. |
| `npm run build` | Exit 0. The route list includes `/api/audit/discovery`. |
| `CI=true npm run test:e2e` (as `ci.yml`; Chromium 1234 from `/opt/pw-browsers`, no browser install) | Exit 0. 67 passed (11.6 min), and the switched-off suite 3 passed. |
| `npm run build:cf` | Not run locally. GitHub CI `validate` on `8a6180e` ran it with the rest of the job and passed ([run 40068076566](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/40068076566)); `Deploy PR preview` passed. |
| verify-nuave `launch`, `doctor`, `drive all`, `capture`, `cleanup` (synthetic) | Run `20261024T061016Z-nk1n`. `doctor` OK. `drive all`: 5 of 6 passed; `audit-run` failed once (N-11), re-run passed. `capture`: 6 passed, 0 external. `cleanup`: port free. Evidence is in `.local-evidence/verify-nuave/20261024T061016Z-nk1n/` (git-ignored). |
| Independent scratch tests (outside the repo, Vitest with the repo's code) | (1) AC-09 end to end; (2) Seluruh Indonesia validation; (3) AC-04b texts; (4) AC-08 named; (5) edited fallback pack, which shows the wrong method claim; (6) discovery reservations and D1 + outbound counts when calls are retried or time out (32 / 62 / 42 units; USD 0.176 held per run); (7) phone numbers in cited URLs; (8) brand words lost to place names; (9) branch-address pre-fill. |
| AC-18 against the base renderer | Base tree from `git archive 65eb165`; the AC-18 snapshot test passes 2/2 with the head's snapshot file. |
| Grep sweeps | Rp99.000 / 99000; "AI summary" / "ringkasan AI" naming; phone and raw keys in the downloaded export. |

No paid provider call was made.

## Findings

### Blocking (fix before re-verification)

**B-1. The spend and request worst cases are not shown, and they pass the spec's limits.**
AC-15, R-09 and R-25 are affected.

- **Question writing is left out of the worst case.**
  - `src/lib/spending/spend-worst-case.test.ts:54-55` sets it to zero with the comment "The
    questions are built in code from the pool: no paid call". That is not true: Cheaper
    Inference writes them (R-10).
  - Each call reserves USD 0.05 (`src/lib/intake/glm-local.ts:565`).
  - One question request makes up to three calls: grounded, grounded again, then the fallback
    (`src/lib/discovery/questions.ts:213`). No per-order limit on question requests exists.
  - With the spec's own figures (two discovery runs, so at least two question requests), the
    sum is about USD 0.24 + 0.36 + 0.82 + 0.40 + 0.30 = **USD 2.12**, over the USD 2.00 hold.
    R-25 says: "If not, stop and ask the founder."
- **The R-09 hard stop counts one reservation per call, but a retry reserves again.**
  - `discover.ts:152-156` counts once per call, while `callDataForSeo` retries a retryable
    status once and reserves again (`dataforseo.ts:186`).
  - When every call times out, one discovery run holds **USD 0.176**, above the USD 0.12 hard
    stop (measured).
- **The discovery request's subrequest worst case has no test.**
  - Measured: 32 D1 queries plus outbound requests normally, **62** when every call is retried
    once. AC-15 requires fewer than 50. This is harmless on Workers Paid, but the criterion
    is explicit.
- **Fix:**
  - count every attempt against the R-09 budget, or drop the retry inside discovery;
  - count question writing in `spend-worst-case.test.ts`, with a per-order cap on question
    requests, or take the total to the founder;
  - add the discovery-request test, or ask the founder to restate the 50 for Workers Paid;
  - correct the "about USD 1.82" note in `SPEC.md`.

**B-2. The written conclusion and findings see only ChatGPT, but read as the whole report's.**
The Report layout ("Findings name the source they come from") and R-28 are affected.

- The report model gets only the ten ChatGPT answers (`runner.ts:1280`). It is told neither
  that they are ChatGPT's nor anything about Google, and it is asked to "answer whether the
  business was discovered and recommended in this tested sample" (`openai.ts:714`).
- Its conclusion is shown directly under both source cards. Nothing asks its findings to name
  their source.
- The synthetic report already shows the contradiction: "Kedai Fiksi tidak disebut dalam
  jawaban sintetis mana pun" sits under "Bisnis Anda muncul di 3 dari 8 pertanyaan" (Google).
  A live report can do the same whenever Google names the business and ChatGPT does not.
- The "Tentang audit ini" paragraph likewise counts only ChatGPT ("9 dari 10 pertanyaan selesai
  diuji; 1 pertanyaan tidak dapat diuji"), while the summary says "3 pemeriksaan tidak dapat
  diuji" (AC-09 case).
- R-28 lists the question's label and topic, each answer's text and the R-16/R-17 facts as the
  prompt's input; the prompt has none of the Google part.
- **Fix:**
  - tell the model the answers are from ChatGPT, and give it the code-built Google counts;
  - or scope its conclusion and findings to ChatGPT ("Di ChatGPT, …");
  - make the synthetic conclusion and the method paragraph agree with the cards.

**B-3. An edited question in a fallback pack makes the report claim Google search data.**
AC-05 and R-08 are affected.

- `search_data_available` is true whenever any question's label is not "Disusun dari profil
  bisnis" (`src/lib/orders/two-source.ts:260-262`). An edit turns one label into "Diubah oleh
  Anda".
- The report then drops "Data pencarian Google tidak tersedia untuk audit ini…" and states
  "Pertanyaan diambil dari data pencarian Google melalui DataForSEO, seluruh Indonesia."
  (`TwoSourceSections.tsx:453`). Reproduced.
- **Fix:** take it from the saved pack's mode (`questions_json.mode === "grounded"`) and add
  a test.

### Notes (should fix or decide; not blocking)

- **N-1. The place does not lock after the second discovery run** (Experience 2, R-07).
  - `SmartReview` has `searchPlaceLocked` (`SmartReview.tsx:85, 511`), but `SmartIntakeJourney`
    never passes it, and the client ignores `locked` from `/api/audit/discovery`
    (`route.ts:71`).
  - The server reuses the latest pool (no extra spend). But a third change of place leaves
    the questions, the pool and Google's place out of step: the questions fall back to the
    profile, and the report then says search data was missing.
- **N-2.** The "Topik yang belum menyebut Anda" rows show "±N pencarian/bulan di Google" with no
  "seluruh Indonesia" and no month (`TwoSourceSections.tsx:431-433`). Next to questions that
  name a city, it reads as local demand.
- **N-3. Brand words now leave out every word of the 344 place names** (`phrase.ts:69, 88`,
  fix `cd9c2a3`).
  - This departs from R-04a's text, and is recorded only as a worker note in `SPEC.md`.
  - A business whose distinctive word is also a place word keeps no brand word except its
    domain label. Examples: "Batu Dental", "Klinik Medan Estetika", "Klinik Sehat Makmur".
    The R-02 request check and the R-11 brand check then stop covering it.
  - It needs the founder's acknowledgement, or a narrower rule (for example, skip only the
    search place's words).
- **N-4.** R-11a names `report-pipeline.ts`, but only the existing direct-ten validator runs
  there (line 189). The place, split and pool checks run at writing and approval only. The
  risk is low because the approved pack is stored on the server.
- **N-5. Phone numbers inside cited URLs are kept.**
  - A ChatGPT source such as `https://wa.me/6281234567890` stays in `sources[].url`
    (`chatgpt.ts:93-110`), which reaches the browser and the export.
  - Mobile numbers written without 0, 62 or + ("8123456789") are not caught.
- **N-6.** The Google list in "Bisnis lain yang disebut" is ChatGPT's names filtered by Google's
  text (`two-source.ts:292`). A business only Google names never appears.
- **N-7.** When discovery meets a credentials or balance refusal, it raises no
  `dataforseo_unavailable` notice (the flag is dropped in `order-discovery.ts`). Only checks and
  payment start raise it.
- **N-8. Pre-fill and labels.**
  - A branch address ending "…, Jakarta Selatan, DKI Jakarta 12810" pre-fills "Jakarta", not
    "Jakarta Selatan": address parts are read from the end (`places.ts:128`).
  - The main Depok entry is labelled "Depok (Jawa Barat)", because the list has no regency for
    it. The labels are distinct, but the spec's example "Depok (Kota Depok, Jawa Barat)" is not
    produced.
- **N-9.** A bare domain in the answer text ("csdental.id") counts as "Tidak disebut", not
  "Dipakai sebagai sumber".
- **N-10.** The method paragraph shows the internal label in Indonesian prose: "DataForSEO
  ChatGPT LLM Scraper - <model>" when live, "synthetic-local-fixture" in synthetic mode.
- **N-11. The verify-nuave `audit-run` drive is racy.**
  - The page's 5-second status poll clears `nuave.activeOrder.v1` when it sees "delivered"
    (Spec 016 R-31, unchanged).
  - If that happens before the drive's reload, the reload lands on the entry screen. It failed
    once in this run and passed on re-run.
  - The extra status calls and the more numerous synthetic runs widen the window. Harden
    `tests/e2e/journey.ts`.
- **N-12.** FAQ answer a7 (`src/messages/id.json`) still says Nuave tests only ChatGPT. It is out
  of scope (S6), but now incomplete.
- **N-13.** ChatGPT calls took 25–70 s in AC-00, and steps run one after another. The 15-minute
  promise is at risk; AC-14 measures it.
- **N-14.** Failed checks and Google "not shown" questions appear as dashed beads within ten
  positions. The spec says "Beads show only completed checks". This is a layout judgment for
  the founder's AC-14 review.
- **N-15.** The `SPEC.md` worker notes are inaccurate on cost and on what the report model reads
  (B-1, B-2).
- **N-16.** "Pertanyaan diambil dari data pencarian Google … seluruh Indonesia" also applies
  "seluruh Indonesia" to the wordings. Autocomplete and "People also ask" were read from the
  search city; only the numbers are national.

### Founder actions (not code defects)

- Approve the exact R-23 promise wording (Q-1) to complete AC-17.
- Before merging:
  - Confirm the `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD` repository secrets exist. The
    deploy job fails on empty values; this verifier could not list secrets.
  - Squash-merge or rebuild the branch: its history still holds the raw probe JSON with
    third-party phone numbers (`050bf9d`, `e986e24`), as the spec's implementation notes
    require.
  - Keep production on Workers Paid: `RUN_UNIT_LIMIT` 80 relies on it.
- Run AC-14.

## Verdict

**Fail.** AC-05 and AC-15 fail, and the Report layout requirement that findings name their
source is not met. All other offline criteria pass. AC-17 waits for the founder's Q-1 wording,
and AC-14 is the founder's live run.

Bounded fix list before re-verification:

1. B-1:
   - count every discovery attempt against the USD 0.12 hard stop (or drop the retry inside
     discovery);
   - add the discovery-request subrequest test;
   - count question writing in `spend-worst-case.test.ts`, with a per-order cap on question
     requests, or take the resulting total to the founder;
   - correct the `SPEC.md` note.
2. B-2: make the written conclusion and findings source-aware. Tell the model the answers are
   ChatGPT's and pass the code-built Google facts, or label them as ChatGPT-only. Align the
   method paragraph and the synthetic conclusion with the cards.
3. B-3: derive `search_data_available` from the saved pack mode, and add a test with one edited
   fallback question.

The notes are recommended in the same pass where cheap: N-1, N-2 and N-5 are small. N-3 needs a
founder decision.

---

## Round 2 (build verification at `1b50615`)

> Result: **Fail**
> Reviewer: independent verifier agent (Claude Code, fresh context; did not build the change or
> the fixes)
> Date: 2026-10-24
> Spec version: `SPEC.md` revision 8, with the worker notes as corrected in `7174e58`
> Implementation: `1b50615` on `claude/laughing-fermi-prsgqf`. The fixes are `1b93a3f` (B-1),
> `7174e58` (B-2, B-3 and notes) and `1b50615` (notes): `git diff bcc84e7..1b50615`, 28 files.

### Scope reviewed

- The full fix diff, read against the spec, `AGENTS.md`, `docs/WORKFLOW.md` and the round-1
  record above.
- The new and changed tests: `spend-worst-case.test.ts`, `order-discovery-routes.test.ts`,
  `two-source.test.ts`, `two-source-writing.test.ts`, `checks.test.ts`, `discovery.test.ts`.
- The places a fix could break something else: the question-writing ceiling against
  Spec 011/013/016 and the question screen's messages; the report's revision call against the
  report-call ceiling; `phoneSafeUrl`; the brand-word rule; the place lock.
- Environments: this sandbox (Node 22.22.0, Chromium from `/opt/pw-browsers`), synthetic mode,
  plus offline live-mode tests with faked provider answers. No DataForSEO, OpenAI or Cheaper
  Inference call was made.

### Round-1 findings: status

| Finding | Status | Evidence |
|---|---|---|
| B-1: spend and request worst cases | **Fixed**, with a design change the founder must decide (N-17) | Every attempt now counts against the discovery hard stop, and one discovery request makes at most 2 retries (`discover.ts:32-35, 157-169`). Measured, with D1 statements, outbound requests and rate-limiter calls counted: 33 subrequests when every call answers, 39 when every call asks to retry (12 calls), 27 when every call times out. Round 1 measured 62 and USD 0.176 held; now at most USD 0.10 is held for the run. The ledger enforces two per-order stage ceilings, discovery USD 0.12 and question writing USD 0.25 (`spend-ledger.ts:100-103`, checked inside the reservation insert). `spend-worst-case.test.ts` counts question writing and puts the order at about USD 1.96: reading 0.82, report 0.41, checks 0.36, questions 0.25, discovery 0.12. The report part is conservative, because an order can make only 3 report calls in all, revisions included (`store.ts:38`, `runner.ts:1254, 1338`). The SPEC note now says USD 1.96. Its "27 subrequests" is the timeout case, not the worst case (N-22). |
| B-2: findings name their source | **Partly fixed**: new blocking finding B-4 | The writer now gets code-built Google facts (outcome, named or not, cited domains; no Google text) and both sources' counts (`runner.ts:1305-1315`, `openai.ts:719-726, 762-767`). The conclusion and every key finding must name ChatGPT or Google. The synthetic conclusion and "Tentang audit ini" now agree with the cards. verify-nuave report: "Di ChatGPT, jawaban sintetis menyebut Kedai Fiksi di 0 dari 9 pertanyaan; di Google AI Overview, di 3 dari 8 ringkasan." and "9 dari 10 pemeriksaan ChatGPT dan 10 dari 10 pemeriksaan Google selesai; 1 pemeriksaan tidak dapat diuji." The round-1 AC-09 test now shows "…di 2 dari 6 ringkasan" and "8 dari 10 pemeriksaan Google". But the new contradiction check also rejects true sentences, and can fail a paid order (B-4). |
| B-3: false search-data claim | **Fixed** | Approval saves `question_mode` from the saved pack (`approve/route.ts:116, 263`), and `searchDataAvailable` reads it (`two-source.ts:97`). Checked end to end through the real routes: a fallback pack with one edited question, then approval, the runner and the report. The saved mode is `fallback`, `search_data_available` is false, and the method list has no "Pertanyaan diambil dari data pencarian Google…" line. The round-1 repro now returns false too. Repo test: `two-source.test.ts` "AC-05: an edited question in a fallback pack…". |
| N-1 place lock | Fixed | `SmartIntakeJourney.tsx:1715-1726, 2475`. In the browser, against the synthetic server: the second discovery run answered `locked: true`. The review screen then disables "Ubah" for Kota untuk pencarian and shows "Kota sudah terkunci untuk pesanan ini.", also after a reload. 8 of the 10 new questions named Surabaya. No repo test covers it (N-24). |
| N-2 demand rows | Fixed | "±1.900 pencarian/bulan di Google, seluruh Indonesia (data September 2026)" on the page and in the PDF. |
| N-3 brand words | Fixed (the narrow rule round 1 suggested) | Only the search place's words stop being brand words (`phrase.ts:81`). "Batu Dental" from Surabaya keeps "batu". "Kedai Fiksi Bandung" from Bandung loses "bandung". All call sites pass the place through `brandInputFor`. R-05b still drops every place word from other businesses' names (`pool.ts:176`). The worker note records the rule. |
| N-4 R-11a in the report pipeline | Not addressed | Still a note. |
| N-5 phone numbers in links | Partly fixed | Messaging links (`wa.me`, `api.whatsapp.com`) and `tel:` are dropped. A query or fragment holding a number is removed. A path holding a number drops the link. New side effect: N-20. Numbers written without 0, 62 or + are still not caught. |
| N-6 Google's business list | Partly fixed | Names now come from Google's own page (local pack titles, organic site names) when the AI Overview text names them. It can still print "Tidak ada." while the text names businesses (N-19), and it can list the business's own branch (N-21). |
| N-7 discovery refusals | Fixed | `order-discovery.ts:100-106`; test: one `dataforseo_unavailable` notice, one call. |
| N-8 pre-fill | Fixed for Jakarta | "…, Jakarta Selatan, DKI Jakarta 12110" and "…, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12110" pre-fill Jakarta Selatan. "…, Jakarta 10220" pre-fills Jakarta. The Depok label is unchanged ("Depok (Jawa Barat)"). |
| N-9 bare domain | Not addressed | Still a note. |
| N-10 internal label | Fixed | `twoSourceMethodSentence` (`two-source-report.ts:284-290`). The internal label stays only in the export's provenance fields. |
| N-11 driver race | Fixed | `features.ts:743-750`. `drive all` passed 6 of 6 the first time. |
| N-12 FAQ a7 | Not addressed | Out of scope (S6). |
| N-13, N-14 | Open | For AC-14 and the founder's layout review. |
| N-15 SPEC worker notes | Mostly fixed | Cost and the report writer's input are now accurate. The subrequest figure is not (N-22). |
| N-16 "seluruh Indonesia" | Fixed | "Pertanyaan diambil dari data pencarian Google melalui DataForSEO. Jumlah pencarian berlaku untuk seluruh Indonesia (data September 2026)." |

### Acceptance results: changes from round 1

| Criterion | Round 1 | Round 2 | Evidence |
|---|---|---|---|
| AC-05 | Fail | **Pass** | See B-3 above. The R-08 sentence shows once (`DirectTenReportBody.tsx:162`, `two-source-report.test.tsx`). |
| AC-15 | Fail | **Pass** | Runner part unchanged: a two-source step measures 23 units, `RUN_UNIT_LIMIT` is 80. Discovery request: at most 39 subrequests measured (< 50), and the repo test asserts it. Spend: about USD 1.96 (≤ 2.00), with the ledger ceilings tested by reserving until refused. See N-17 for the design change. |
| AC-11 | Pass, with notes | Pass, with notes | N-2 fixed. N-19 (the Google list) remains. |
| AC-16 | Pass, with note | **Pass** | Run `20261024T071816Z-5rkp`: 6 of 6 the first time, 0 external requests. The report holds an empty AI Overview (question 3), no AI Overview (question 5) and a failed ChatGPT check (question 7). |
| AC-14 | Not verified | Not verified | The founder's live run. |
| AC-17 | Partial (founder) | Partial (founder) | Unchanged: "Diperiksa di ChatGPT dan Google AI Overview", "Total Rp249.000", "Bayar Rp249.000" and the R-23 proposal on checkout. No Rp99.000 in `src/` or the skill. Q-1 still waits for the founder. |

All other criteria that passed in round 1 still pass:

- AC-00: the recorded probe.
- AC-01 to AC-04c, AC-06 to AC-10, AC-12, AC-13, AC-18 and AC-19: the unit and browser suites
  are green.
- AC-01 in the browser: "Kota: Bandung", pre-filled with the exact helper text.
- AC-09: the round-1 end-to-end test, re-run.
- AC-12: the downloaded export holds no phone-like number, no email and no raw DataForSEO key.
  The writer's Google facts hold no answer text.
- AC-18: the files that render old reports are unchanged since round 1. The snapshot file is
  unchanged (sha256 `648eeffa…`).

### Requirements trace: changes

- **Now met:**
  - R-09: every attempt counts, under a per-order ceiling (N-17).
  - R-25.
  - R-28: the Google facts reach the writer without text.
  - R-07 / Experience 2: the place lock.
  - R-21: discovery notices.
  - R-02 / R-04a: the narrowed brand-word rule.
- **Partly met:**
  - Report layout, "Findings name the source they come from": the naming is met. The
    contradiction check behind it is wrong (B-4).
  - Report layout, "one list per source, taken from the answer text" (N-19).
- **Still not met:** R-11a in `report-pipeline.ts` (N-4).
- **Deviation from approved text:** R-09's per-run hard stop and R-25's "2 runs × USD 0.12" are now
  one USD 0.12 per order. Only the worker note says so (N-17).

### Checks run (round 2)

| Check | Result |
|---|---|
| `npm run check` | Exit 0. Typecheck, lint (0 errors, 24 warnings, as in round 1), format and typography pass. |
| `npm run test:unit` | Exit 0. 138 files, 2,487 tests passed. |
| `npm run build` | Exit 0. The route list includes `/api/audit/discovery`. |
| `CI=true npm run test:e2e` (as `ci.yml`; Chromium from `/opt/pw-browsers`, no browser install) | Exit 0. 67 passed (11.7 min); the switched-off suite: 3 passed. |
| `npx tsc --noEmit -p .agents/skills/verify-nuave` | Exit 0. |
| verify-nuave `launch`, `doctor`, `drive all`, `capture`, `cleanup` (synthetic) | Run `20261024T071816Z-5rkp`. `doctor` all PASS (clean tree at `1b50615`). `drive all`: 6 of 6 passed the first time. `capture`: 6 passed, 0 unexpected external requests, 114 files. `cleanup`: group stopped, port 3100 free. Evidence is in `.local-evidence/verify-nuave/20261024T071816Z-5rkp/` (git-ignored). |
| Report evidence read | `question-review/06-report-by-link.png` (cropped and read), the `.aria.yml` snapshots, `report-link/report-a4.headless.pdf` (15 pages, same text as the page) and `report-link/download-evidence.json`. |
| GitHub CI on `1b50615` | `validate` success ([run 40072393643](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/40072393643)). `Deploy PR preview` success. |
| Scratch tests, outside the repo (Vitest on the repo's code; live mode with faked provider answers) | (1) The discovery request: 33 / 39 / 27 subrequests; a second run after a normal first run at the probe's real costs sends 5 of 10 calls. (2) The source check on true and false sentences. (3) Through the real runner: a writer that keeps a true sentence fails the order. (4) A finding from the real 2026-10-23 Sozo report against the check. (5) AC-05 through the real routes. (6) The question-writing ceiling with billed and with unknown-cost answers. (7) `phoneSafeUrl`, Google's list, the Jakarta pre-fill, brand words, the Depok labels. (8) Round 1's scratch suite re-run: AC-09 and the discovery counts. |
| Browser check (Playwright against the verify-nuave server, shared journey driver) | The place locks after the second discovery run and stays locked after a reload. |

No paid provider call was made.

### Findings (round 2)

#### Blocking (fix before the live run, AC-14)

**B-4. The new source check treats true sentences as contradictions, and can fail a paid order.**
It affects the B-2 fix: the Report layout ("Findings name the source they come from") and R-19's
intent to deliver.

- **The rule.** `twoSourceWritingViolations` (`two-source-report.ts:216-275`) rejects any sentence
  about one source that contains "tidak (pernah) disebut / disebutkan / muncul / menyebut /
  ditemukan / direkomendasikan" when that source's named count is above zero. It does this even
  when the sentence is limited to some questions or carries a count.
- **True sentences rejected** (ChatGPT named the business 3 times, Google 3 times):
  - "Di ChatGPT, bisnis Anda disebut di 3 dari 9 jawaban, tetapi tidak direkomendasikan."
  - "Di Google AI Overview, bisnis Anda disebut di 3 dari 8 ringkasan dan tidak disebut di 5
    ringkasan lainnya."
  - "Di ChatGPT, bisnis Anda tidak muncul untuk pertanyaan tentang harga."
  - "Di ChatGPT, Sozo tidak muncul pada kebutuhan lain". This is the title of a finding in the
    real 2026-10-23 Sozo report, with the "Di ChatGPT" the prompt now requires.
- **The prompt invites it.** It still says "Make the conclusion answer whether the business was
  discovered and recommended in this tested sample" (`openai.ts:716`). "Recommended" is not part
  of the named counts, so "…disebut, tetapi tidak direkomendasikan" is both likely and true.
- **The consequence.** The one revision is told the true sentence "contradicts the counts". If
  the writer keeps it, the attempt fails (`report-pipeline.ts:547-556`). An order has only 3 report
  calls, revisions included: draft and revision, then one more draft with no revision left. After
  that the paid order fails with no report.
- **Reproduced through the real runner** (synthetic answers; Google named the business in 3 of 8
  summaries). The writer kept the true complement sentence: 3 report calls, state `failed`, no
  report, and the failure email "Audit Nuave Anda belum bisa diselesaikan". When the revision
  dropped the clause, the order was delivered.
- **Fix:**
  - flag only absolute claims (for example with "sama sekali", "tidak pernah", "mana pun",
    "satu pun", "semua", "seluruh" or "kedua"), and drop "direkomendasikan" from the list;
  - add tests with the true sentences above;
  - safer: never fail a paid order on this check. When the revision still trips it, replace that
    conclusion or finding with a code-built per-source sentence, as the synthetic report does.

#### Notes (should fix or decide; not blocking)

- **N-17. Founder decision: discovery's USD 0.12 is now per order, not per run.**
  - R-09 ("hard stop at USD 0.12", per run) and R-25 ("2 runs × USD 0.12 = USD 0.24") are
    unchanged. Only the worker note says "shared by both runs". R-25 says to ask the founder when
    the total passes USD 2.00. With two full runs it would be about USD 2.08.
  - Measured with the probe's real costs: the first run settles at about USD 0.07. The second run
    (R-07: the customer changed the place or a service) then sends 5 of its 10 calls: 2 "People
    also ask" searches and 3 of 4 keyword calls. The ceiling refuses the 4th keyword call, and all
    4 autocomplete calls are skipped.
  - Autocomplete gave most of the counted real wordings in the probe. For CS Dental, 14 of the 15
    listed are "Dicari di Google" texts that name Surabaya and have no volume of their own, which
    is what the "<service> surabaya" autocomplete calls return. A customer who changes the place
    therefore gets few "Dicari di Google" questions for the new place.
  - Options:
    - accept it, and amend R-09 and R-25;
    - raise the order hold to about USD 2.10;
    - make the second run cheaper: reuse the place-independent keyword calls when only the place
      changed, or ask autocomplete before the keyword calls.
- **N-18. The question-writing ceiling (USD 0.25 per order) can leave a paid order stuck.**
  - Normal use is unaffected. Billed answers settle at about USD 0.0005, so 12 requests in a row
    were accepted (USD 0.006 held).
  - It binds only on calls whose cost stays unknown. After 5 timeouts or 5xx answers, every later
    request for that paid order is refused with "Pembuatan pertanyaan sedang tidak tersedia. Coba
    lagi nanti." The order never recovers, so "Coba lagi nanti" misleads, and the screen offers no
    support address. Before this change only the USD 2.00 hold stopped it, after roughly 20 or
    more such failures, depending on what the reading had used.
  - No conflict with Spec 011/013/016: the retry button, its live-cost notice and the existing
    message are unchanged. A "third write again refused" does not happen while calls are billed.
  - Suggest: on a `spend_cap` refusal for a paid order, show the support address, or send the
    founder a notice.
- **N-19. Google's "Bisnis lain yang disebut" can say "Tidak ada." while the AI Overview names
  businesses.**
  - The list keeps only names from the same results page (local-pack titles, organic site
    names) that appear in the AI Overview text in exactly that form (`google.ts:135-160`). An empty
    list prints "Tidak ada." (`TwoSourceSections.tsx:409`).
  - The verify-nuave synthetic report shows it. Google's summaries say "Kedai Fiksi dan Klinik
    Sintesa Contoh sering disebut", and the Google list says "Tidak ada." Round 1 showed the name.
  - A live AI Overview can name many businesses: the 2026-10-23 Sozo test named six clinic
    chains. Only those on the same page, in the same form, are kept.
  - Suggest: match the union of Google's page names, ChatGPT's names and discovery's seen names
    against the AI Overview text, and never print "Tidak ada." for Google when it showed summaries.
- **N-20. `phoneSafeUrl` drops some real article links.** A path holding 8 to 15 digits that
  start with 0 or 62 counts as a phone number (`phones.ts:60`). So kompas.com articles published
  before 10:00 disappear from the source lists and cited domains, for example
  `…/read/2023/05/12/080000565/…`. A detik, CNN Indonesia or Facebook ID link is kept.
- **N-21. The business's own branch can appear as "another business".** Own names are excluded
  only on an exact match (`two-source.ts:263, 271`). So "CS Dental Surabaya" is listed for a
  business named "CS Dental", and R-16 counts it as named at the same time. The ChatGPT list
  already did this in round 1; the new Google list does it too.
- **N-22.** The SPEC worker note says the discovery request's worst case "measured 27
  subrequests". 27 is the timeout case. The case where every call asks to retry measures 39. Both
  are under 50.
- **N-23.** The new method sentence says "ke Google (AI Overview)" (`two-source-report.ts:289`).
  VOICE §2 settles "Google AI Overview". "menanyakan … ditanyakan" repeats itself.
- **N-24.** The place lock (N-1) has no automated test. I checked it in the browser only.
- Still open from round 1:
  - N-4;
  - N-8's Depok label;
  - N-9;
  - N-12;
  - N-13 and N-14 (AC-14 and the founder's review);
  - N-5's numbers written without 0, 62 or +.

#### Founder actions (unchanged from round 1, plus N-17)

- Decide N-17.
- Approve the R-23 wording (Q-1).
- Before merging:
  - confirm the DataForSEO repository secrets;
  - squash-merge or rebuild the branch, because `050bf9d` and `e986e24` with the raw probe JSON
    are still in its history;
  - keep production on Workers Paid.
- Run AC-14.

### Verdict (round 2)

**Fail.** B-1 and B-3 are fixed, and AC-05 and AC-15 now pass. B-2's fix brought one blocking
problem: the source check can fail a paid order when the report states something true (B-4).
Every other criterion that passed in round 1 still passes. AC-17 waits for Q-1, and AC-14 is the
founder's live run.

Bounded fix list before re-verification:

1. B-4:
   - limit the contradiction check to absolute claims, and drop "direkomendasikan";
   - or never fail a paid order on it: after the revision, fall back to a code-built per-source
     sentence;
   - add tests with the true sentences listed above.

Cheap and recommended in the same pass:

- N-19: Google's list, and no false "Tidak ada.";
- N-23: "Google AI Overview" in the method sentence;
- N-18: a support address on a refused question request for a paid order;
- N-20: keep links whose digit run is not a phone number.

N-17 needs the founder.

---

## Round 3 (build verification at `727843a`)

> Result: **Fail**
> Reviewer: independent verifier agent (Claude Code, fresh context; did not build the change or the
> fixes)
> Date: 2026-10-24
> Spec version: `SPEC.md` revision 8, with the worker notes as updated in `539ad90` and `b022666`,
> and R-23 and Q-1 as updated in `727843a`
> Implementation: `727843a` on `claude/laughing-fermi-prsgqf`, the PR head when this round ended.
> The round-2 fixes are `539ad90` (B-4), `eeba3e9` (N-19, N-20, N-21), `b022666` (N-18, N-22,
> N-24) and `0783ec5` (formatting): `git diff cdb3eae..0783ec5`, 21 files. `727843a` arrived
> during this round. It sets the delivery promise to the wording the founder approved (Q-1) and
> records a decision for a "Klinik Anda" label that is not built yet. Checks marked `0783ec5` ran
> before it arrived; the others ran on `727843a`.

### Scope reviewed

- The full fix diff and `727843a`, read against the spec, `AGENTS.md`, `docs/WORKFLOW.md` and the
  round-1 and round-2 records above.
- The new and changed tests: `two-source-writing.test.ts`, `two-source.test.ts`,
  `two-source-report.test.tsx`, `checks.test.ts`, `order-discovery-routes.test.ts`,
  `spend-routes.test.ts`, `smart-review-place-lock.test.tsx`, `founder-notices.test.ts`.
- The places a fix could break something else:
  - what the narrowed source check stops catching: the same sentences run against the round-2
    check (`cdb3eae`) and the round-3 check;
  - the code-built repair sentences, in Indonesian and against the cards;
  - the new support message, for every way question writing can be refused;
  - Google's business list and the own-branch rule;
  - the narrowed phone rule for links.
- Environments: this sandbox (Node 22.22.0, Chromium from `/opt/pw-browsers`), synthetic mode,
  plus offline live-mode tests with faked provider answers. No DataForSEO, OpenAI or Cheaper
  Inference call was made.

### Round-2 findings: status

| Finding | Status | Evidence |
|---|---|---|
| B-4: the source check can fail a paid order on a true sentence | **Fixed** for delivery; new blocking finding B-5 | Through the real runner (synthetic answers; Google named the business in 3 of 8 summaries, ChatGPT in 0 of 9, and in a second setup 3 of 9). Round 2's repro, the writer keeping the true sentence "…disebut di 3 dari 8 ringkasan dan tidak disebut di 5 ringkasan lainnya", is now delivered after 1 report call with no revision (round 2: 3 calls, `failed`, the failure email). A persistent absolute contradiction ("Di Google AI Overview, bisnis Anda tidak disebut sama sekali.") gets one revision. It is then replaced by "Di Google AI Overview, bisnis Anda disebut di 3 dari 8 ringkasan." and the order is delivered, with `source_sentence_replaced` in the telemetry. The same happens when the revision call itself fails, and for the finding title "Di ChatGPT, bisnis Anda tidak pernah disebut" (replaced by "Di ChatGPT, bisnis Anda disebut di 3 dari 9 jawaban."). A conclusion that names no source, twice, gets both count sentences in front. All six true sentences from round 2 pass with no revision. A source-only revision changes text only, so the revision check (`report-language.ts`, protected shape) does not reject it. The repair sentences read correctly and use the same counts as the cards. But the narrowed check also lets plain false negations through (B-5), and the repair has three rough edges (N-26). |
| N-17: discovery's USD 0.12 per order | **Open** (founder decision) | The SPEC note now says "founder decision pending (N-17)". Not blocking. |
| N-18: the question-writing limit strands a paid order | **Fixed** | Real route, live mode, faked HTTP 500 answers: requests 1 to 5 each send one call. Request 6 and later send nothing and show "Pertanyaan untuk pesanan ini belum dapat dibuat lagi. Email support@nuave.ai, kami bantu menyelesaikannya." There is one `questions_limit` notice per order; its email names the order number and asks for a reply within one business day. The grounded and fallback paths both get it. Billed but unusable answers still allow 12 rewrites in a row. The refusal records no generation attempt, as before. |
| N-18 side effect: a spent USD 2.00 hold also gets the support message | **Correct**; no regression | With USD 1.95 already held by the reading, the second question request is refused with the same message and notice. An order's calls are checked only against its hold and the stage ceiling, never the daily cap (`spend-ledger.ts:494-495`), so neither refusal recovers with time and "Coba lagi nanti" would mislead. The other refusals (`order_refused`, ledger unavailable) keep "Coba lagi nanti". |
| N-19: Google's list says "Tidak ada." | **Fixed** | `two-source.ts:368-377`, `TwoSourceSections.tsx:410-415`. Through the real runner, Google's list holds its page's names plus the ChatGPT names its text repeats. A local-pack name the text does not repeat stays out. An empty Google list reads "Tidak ada nama bisnis lain yang kami kenali." whenever Google showed a summary. The verify-nuave report now lists "Klinik Sintesa Contoh" under Google AI Overview, on the page and in the PDF (round 2: "Tidak ada."). |
| N-20: article links dropped | **Fixed**; new note N-25 | kompas.com articles published before 10:00 are kept again (checked at both commits). The narrowed rule no longer catches a mobile number written with separators in a link's path (N-25). |
| N-21: the business's own branch listed as another business | **Fixed** | `two-source.ts:244-250`, `google.ts:141-145`. Through the real runner, "Kopi Nuave Bandung" (business "Kopi Nuave") is left out of both lists. The rule is the same whole-word match R-16 uses for "named", so the lists and the counts agree. |
| N-22: the SPEC's subrequest figure | **Fixed** | The note gives 33, 39 and 27 subrequests, all under 50. |
| N-23: the method sentence | **Fixed** | "Audit ini menanyakan 10 pertanyaan yang sama ke aplikasi ChatGPT dan ke Google AI Overview melalui DataForSEO." On the page and in the PDF. |
| N-24: the place lock has no test | **Partly fixed** | `smart-review-place-lock.test.tsx` tests the review screen's lock, and the route test asserts `locked: true`. The step between them, where `SmartIntakeJourney.tsx` reads `locked` and passes it to the review screen (`SmartIntakeJourney.tsx:1715-1726, 2475`), is where round 1's N-1 defect was. It still has no automated test. My browser check passes at `727843a`: the second discovery run answers `locked: true`, "Ubah" for Kota untuk pencarian is disabled with "Kota sudah terkunci untuk pesanan ini.", also after a reload, and 8 of the 10 new questions name Surabaya. |
| Round-1 notes still open | Unchanged | N-4, N-8 (the Depok label), N-9, N-12, N-14 and N-5's numbers written without 0, 62 or +. N-13 is now sharper (N-28). |

### Acceptance results: changes from round 2

| Criterion | Round 2 | Round 3 | Evidence |
|---|---|---|---|
| AC-11 | Pass, with notes | Pass, with notes | The code-built counts, sentences and rows are unchanged and their tests pass. N-19 is fixed. The written conclusion or a finding can again contradict the cards when it uses a plain negation (B-5). That belongs to the Report layout requirement, not to AC-11's code-built text. |
| AC-12 | Pass | Pass, with note | The stored results, the saved report, the writer's input and the export hold no phone number (tests). The export the browser downloaded at `727843a` holds no phone-like number, no email address and no raw DataForSEO key. A mobile number written with separators inside a link's path is kept again (N-25). |
| AC-16 | Pass | Pass | Run `20261024T082520Z-732s` at `727843a`: 6 of 6 the first time, 0 unexpected external requests. The report holds an empty AI Overview (question 3), no AI Overview (question 5) and a failed ChatGPT check (question 7, "Tidak dapat diuji" with "Minta bantuan"). |
| AC-17 | Partial (founder) | **Pass** | At `727843a` the checkout shows "Diperiksa di ChatGPT dan Google AI Overview", "Total Rp249.000", "Bayar Rp249.000" and "Laporan siap dalam 15 menit setelah audit dimulai. Jika ada bagian yang gagal diperiksa, tim kami membantu menyelesaikannya; jika tidak dapat diselesaikan, kami kembalikan uang Anda." (`report-link/03-order-summary.aria.yml`). The payment email uses the same `DELIVERY_PROMISE` (`founder-notices.test.ts`). The decision log records the founder's approval of these words on 2026-10-24; I did not see the approval itself. The old wording remains only in history (Spec 017, older decision-log rows). No Rp99.000 in `src/` or the skills. See N-28 on the timing this wording promises. |
| AC-14 | Not verified | Not verified | The founder's live run. |

All other criteria that passed in round 2 still pass:

- AC-00: the recorded probe.
- AC-01 to AC-04c, AC-05, AC-06 to AC-10, AC-13, AC-15, AC-18 and AC-19: the unit and browser
  suites are green on `727843a`, and CI is green on `0783ec5` and `727843a`.
- AC-01 in the browser: "Kota: Bandung", pre-filled, with the exact helper text
  (`rich-preparation/03-summary-after-reload.aria.yml`).
- AC-05: round 2's check through the real routes, re-run. A fallback pack with one edited
  question saves `fallback`, `search_data_available` is false, and the method list has no
  search-data line.
- AC-09: round 1's end-to-end test, re-run. The order is delivered with N = 9, M = 8 and K = 3,
  three "Minta bantuan" links name the order and the question, and there is one `checks_failed`
  notice.
- AC-15: round 2's discovery measurements, re-run: 33, 39 and 27 subrequests.
  `spend-worst-case.test.ts` is green.
- AC-18: the files that render old reports are unchanged since round 1, and the snapshot file is
  unchanged (sha256 `648eeffa…`).

### Requirements trace: changes

- Report layout, "Findings name the source they come from": the naming is met, and no paid order
  fails on the check any more. The contradiction check misses plain negations (B-5).
- R-19 ("A denominator of 0 shows 'Tidak diuji'"): the repair can write "0 dari 0 ringkasan"
  (N-26).
- R-23: now the approved words (AC-17).
- R-28 / AC-12: N-25.
- Still not met: R-11a in `report-pipeline.ts` (N-4).
- Deviation from approved text: N-17, unchanged, waiting for the founder.
- New, not built: the founder's "Klinik Anda" label (2026-10-24 decision). The spec and the decision
  log both say "not built yet", for Spec 018 or a follow-up (N-29).

### Checks run (round 3)

| Check | Result |
|---|---|
| `npm run check` | Exit 0 at `0783ec5` and at `727843a`. Typecheck, lint (0 errors, 24 warnings, as in rounds 1 and 2), format and typography pass. |
| `npm run test:unit` | Exit 0. `0783ec5`: 139 files, 2,496 tests passed. `727843a`: 139 files, 2,496 tests passed. |
| `npm run build` | Exit 0 at `0783ec5` and at `727843a`. The route list includes `/api/audit/discovery`. |
| `CI=true npm run test:e2e` (as `ci.yml`; Chromium from `/opt/pw-browsers`, no browser install) | `727843a`: exit 0; 67 passed (11.7 min), and the switched-off suite 3 passed. `0783ec5`: 66 of 67 passed. One test stalled once while my own Vitest runs were loading the machine (N-30), so the switched-off suite did not start. That test then passed 3 of 3 on its own, and the switched-off suite passed 3 of 3. |
| GitHub CI | `validate` success on `0783ec5` ([run 40076414698](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/40076414698)), which includes `build:cf` and the browser tests. `validate` success on `727843a` ([run 40077805086](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/40077805086)). `Deploy PR preview` success on both. |
| verify-nuave `launch`, `doctor`, `drive all`, `capture`, `cleanup` (synthetic) | Run `20261024T082520Z-732s` at `727843a`. `doctor` all PASS (clean tree). `drive all`: 6 of 6 passed the first time. `capture`: 6 passed, 0 unexpected external requests, 114 files. `cleanup`: group stopped, port 3100 free. Evidence is in `.local-evidence/verify-nuave/20261024T082520Z-732s/` (git-ignored). |
| Report evidence read | `report-link/11-report-by-link.png` (cropped and read), the `.aria.yml` snapshots, `report-link/report-a4.headless.pdf` (16 pages, same text as the page, both business lists) and `report-link/download-evidence.json`. The cards and the written conclusion agree: ChatGPT 0 of 9; Google AI Overview shown in 8 of 10 and naming the business in 3 of 8. |
| Scratch tests, outside the repo (Vitest on the repo's code; live mode with faked provider answers) | (1) The source check on 6 true and 16 false sentences, round 2's version (`cdb3eae`) against this one, and the repair's output. (2) B-4 through the real runner, 8 scenarios. (3) The question-writing limit through the real route in live mode: unknown-cost failures, a spent hold, billed answers. (4) Google's list and the own-branch rule through the real runner. (5) `phoneSafeUrl` on 17 links at both commits. (6) Round 1's and round 2's scratch suites. Everything in this row was re-run at `727843a`. |
| Browser check (Playwright against the verify-nuave server, shared journey driver) | The place locks after the second discovery run and stays locked after a reload (N-24). |

No paid provider call was made.

### Findings (round 3)

#### Blocking (fix before the live run, AC-14)

**B-5. The narrowed source check lets plain false negations through.** It undoes part of B-2's
fix: the Report layout's "Findings name the source they come from", and the check that the written
conclusion never contradicts the cards.

- **The rule now.** A sentence counts as a contradiction only when it holds one of the words
  "sama sekali", "tidak pernah", "mana pun", "satu pun", "semua", "seluruh" or "kedua", and no
  "X dari Y" count (`two-source-report.ts:216-232`). The code's comment says the aim is to keep
  sentences "limited to some questions" or "carrying a count". A plain negation is neither, but it
  has no marker word, so it is treated as limited.
- **False sentences that now ship unchanged** (ChatGPT named the business in 3 of 9 answers,
  Google in 3 of 8 summaries). The round-2 check caught every one:
  - "Di Google AI Overview, bisnis Anda tidak disebut."
  - "Di ChatGPT, bisnis Anda tidak muncul" (a finding title)
  - "Di ChatGPT, jawaban tidak menyebut bisnis Anda."
  - "Di ChatGPT, bisnis Anda sama sekali tidak disebut (0 dari 9 jawaban)." Any count exempts a
    sentence, even a wrong one.
- **Reproduced through the real runner.** The conclusion "Di Google AI Overview, bisnis Anda tidak
  disebut." was delivered after one report call, with no revision asked, under the Google card
  "Bisnis Anda muncul di 3 dari 8 pertanyaan". The finding title "Di ChatGPT, bisnis Anda tidak
  muncul" was delivered under a ChatGPT card of 3 of 9.
- **The prompt invites it.** It defines an absolute negation only by the marker phrases, and says
  a statement "limited to some questions, or one that carries a count, is fine"
  (`openai.ts:725`). A writer can take a plain "tidak disebut" as allowed.
- **Why it matters.** This is the B-2 defect, a written sentence contradicting the cards right
  above it, which the check exists to stop. The live writer usually limits its negations (the
  2026-10-23 Sozo report: "Sozo tidak muncul pada kebutuhan lain"), so it will not be frequent. A
  short finding title is where a plain negation is most likely.
- Round 2's suggested fix was underspecified: its marker words were examples of an absolute claim,
  and an unqualified negation is absolute too.
- **Fix:**
  - treat a negation about a source that named the business as a contradiction, unless the
    sentence limits it (to some questions, a topic, or "lainnya") or carries that source's correct
    count;
  - keep B-4's repair as the backstop, so a true sentence that gets flagged costs only a plainer
    sentence, never the order;
  - make the prompt say the same;
  - add the four sentences above to the tests.

#### Notes (should fix or decide; not blocking)

- **N-25. A mobile number written with separators in a link's path is kept again** (a side effect
  of N-20).
  - The path rule now matches only an unbroken run of digits (`phones.ts:38`).
  - Kept now, dropped in round 2: `…/jual-kopi-hubungi-0812-3456-7890-iid-912345`,
    `…/kontak-0812.3456.7890`, `…/kontak/0812%203456%207890`, `…/hubungi-62-812-3456-7890`. A
    page address made from a title that holds a phone number usually looks like the first one.
  - Cheap fix: remove the separators between digits in the path before the mobile check.
    kompas.com's article IDs stay kept.
  - **Landlines in a link's path** (`…/kontak/0215551234`, `…/cabang-surabaya-031-8291234`) are an
    acceptable residual, in my judgment. They are rare in cited links, they are a business's
    published office line rather than a person's number, and a rule that catches them also catches
    article IDs (N-20). AC-12's wording is absolute, so record the exception in the SPEC note for
    the founder to accept.
- **N-26. The code-built repair sentences have three rough edges.** They read correctly in
  Indonesian, and their numbers match the cards. Each edge needs the writer to repeat a problem
  after its one revision, so all are unlikely.
  - When Google showed no AI Overview in any completed check, the repair writes "di Google AI
    Overview, bisnis Anda disebut di 0 dari 0 ringkasan" (reproduced through the runner). R-19
    says a denominator of 0 shows "Tidak diuji". Say instead that Google showed no AI Overview.
  - A finding that names no source gets "Di ChatGPT:" in front, even when it is about the AI
    Overview and only omits the word "Google": "Di ChatGPT: Ringkasan AI Overview lebih sering
    menyebut klinik lain." (reproduced). Count "AI Overview" as naming Google.
  - A replaced sentence before a semicolon clause leaves "…jawaban. di Google AI Overview, …"
    (lowercase after a full stop), or "…; Di Google AI Overview…". A replaced finding title ends
    with a full stop, unlike the others.
- **N-27. Wrong counts are never checked, and neither is "tidak … maupun …" across both sources.**
  "Di ChatGPT, bisnis Anda disebut di 0 dari 9 jawaban." (ChatGPT named it 3 times) and "Kopi Nuave
  tidak disebut di ChatGPT maupun Google AI Overview." (Google named it) both pass. Both passed in
  round 2 too. Checking that each "X dari Y" about a source matches its code count is cheap; it
  fits with B-5.
- **N-28. The approved delivery promise has no hedge left** (founder decision, `727843a`; sharpens
  round 1's N-13).
  - "Laporan siap dalam 15 menit setelah audit dimulai." drops "biasanya" and "paling lama 24 jam".
  - The runner takes at most one step per order per one-minute cron run (`runner.ts:132-134`). Ten
    question steps and the report step need at least 11 minutes before any retry. Each retried
    check adds about a minute, and AC-00 measured ChatGPT calls of 25–70 s.
  - So some orders will pass 15 minutes, and the promise no longer gives the customer an upper
    bound. AC-14 should record the time. If it comes close to 15 minutes, keep "biasanya".
- **N-29. The founder's "Klinik Anda" label is recorded but not built.** The spec and the decision
  log both say so (`727843a`), for Spec 018 or a follow-up. When it is built, the code-built
  sentences that say "bisnis Anda" must follow it too: B-4's repair sentence and the synthetic
  conclusion, as well as the cards.
- **N-30. One browser test stalled once on `0783ec5`.** "material correction invalidates the old
  questions; cancel keeps the committed pack" waited 10 s on the question screen's loading state.
  Both requests had already answered 200 in under 100 ms with ten questions, and the page made no
  other request. My own Vitest runs were loading the machine at that moment. It passed 3 of 3 on
  its own, and in the full run on `727843a`. CI is green on both heads. Nothing in this round's
  diff touches that screen. If it recurs in CI, look at the question flow's state handling after a
  cancelled correction.
- **N-24 (rest).** Add a test for the journey step that passes the discovery route's `locked` to
  the review screen.
- Still open:
  - N-17 (the founder);
  - N-4, N-8's Depok label, N-9, N-12 and N-14;
  - N-5's numbers written without 0, 62 or +.

#### Founder actions

- Decide N-17.
- Consider N-28 (the promise's hedge) before AC-14.
- Before merging:
  - confirm the DataForSEO repository secrets;
  - squash-merge or rebuild the branch, because `050bf9d` and `e986e24` with the raw probe JSON
    are still in its history;
  - keep production on Workers Paid.
- Run AC-14.

Q-1 is answered (AC-17 passes).

### Verdict (round 3)

**Fail.** B-4's harm is gone: no paid order fails on the source check, true sentences pass, and an
absolute contradiction the writer keeps is replaced by a code-built sentence that matches the
cards. N-18 to N-23 are fixed, and AC-17 now passes with the founder's wording. But the narrowed
check now lets a plain false negation through (B-5), which round 2's check caught. Every other
criterion that passed before still passes. AC-14 is the founder's live run.

Bounded fix list before re-verification:

1. B-5: flag a plain negation about a source that named the business; keep the repair; make the
   prompt say the same; add the four sentences as tests.

Cheap and recommended in the same pass:

- N-25: remove separators between digits before the path check;
- N-26: no "0 dari 0", and "AI Overview" counts as naming Google;
- N-27: check each "X dari Y" against the code counts.

N-17 and N-28 need the founder.
