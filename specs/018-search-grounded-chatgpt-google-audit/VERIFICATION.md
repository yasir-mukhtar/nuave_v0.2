# Verification: Spec 018 — Real-search questions, answered by ChatGPT and Google (Rp249.000)

> Result: **Fail** (build verification, round 1)
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
