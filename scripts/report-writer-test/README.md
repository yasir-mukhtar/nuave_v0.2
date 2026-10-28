# Report-writer test (test B)

Test B of the [audit stack plan](https://claude.ai/artifact/BJ3gmR68chCiczK8CwYFR8)
(decision 2026-10-26, as fixed on 2026-10-27), which is Spec 021's
side-by-side writer test (B-07): eight writers on the same saved orders, each
running today's production writer, judged blind by the founder.

| Blind entry | Model | Effort |
| --- | --- | --- |
| `luna-low` | GPT-5.6 Luna | low |
| `luna-high` | GPT-5.6 Luna | high |
| `sonnet-medium` | Claude Sonnet 5.5 | medium |
| `sonnet-high` | Claude Sonnet 5.5 | high |
| `haiku-medium` | Claude Haiku 5.5 | medium |
| `glm-low` | GLM 5.3 Flash (Cheaper Inference; added 2026-10-27) | low |
| `opus-low` | Claude Opus 5.5 (added 2026-10-27) | low |
| `opus-medium` | Claude Opus 5.5 (added 2026-10-27) | medium |

Every entry reads the new input: today's input plus the words of Google's AI
Overview for each question (phone numbers removed, answers longer than 3,000
characters shortened). Every entry goes through the order runner's own report
code, so all reports get the same checks and repairs.

The report the customer received is printed beside them as a labelled
**reference**, never under a letter: it was written with the instructions of
its day, so it does not compare models fairly.

Everything the test reads and writes stays in the git-ignored
`.local-evidence/report-writer-test/` folder.

## With Spec 021 Part B

This test is Spec 021's side-by-side writer test (B-07). It writes with
whatever the production writer is at the time of the run, so once Part B is
merged it writes Part B reports with no change here:

- the prompt, output format and assembly come from `reportRequest`,
  `reportOutputSchema` and `reportContentFromAnswer` in
  `src/lib/audit/openai.ts`;
- Google's answer texts are added only while the production prompt does not
  already carry them (B-01);
- each result records which writer wrote it (a fingerprint of the
  instructions and answer format). A result from an earlier writer is moved to
  `runs/<order>/superseded/` and written again, and letters are drawn only
  for a full set of results from the same writer;
- the reference is compared with a replay of its own writing only when
  today's writer version wrote it; an older one is shown as delivered;
- the reports print from today's `/r` page.

Run it on orders delivered after Part B for a like-for-like comparison.

## 1. Save an order's evidence

For each order (delivered, with ChatGPT and Google answers), save two
read-only database answers. `harness.ts` (`exportQueries`) prints the exact
queries; they read no email, payment or link column.

```sh
npx wrangler d1 execute SPEND_DB --remote --json --command "<order query>" > .local-evidence/report-writer-test/raw/NV-XXXXXX-order.json
npx wrangler d1 execute SPEND_DB --remote --json --command "<questions query>" > .local-evidence/report-writer-test/raw/NV-XXXXXX-questions.json
```

## 2. Dry run (no provider call, free)

```sh
npx vitest run --config vitest.live-provider.config.ts scripts/report-writer-test/run.spec.ts
```

It re-runs each delivered report from its evidence (it must come back
unchanged), builds every other entry's prompt and writes `plan.json` with each
call's worst case.

## 3. Live run (founder approval first)

```sh
REPORT_TEST_LIVE=1 npx vitest run --config vitest.live-provider.config.ts scripts/report-writer-test/run.spec.ts
```

Needs `OPENAI_API_KEY`, `NUAVE_ANTHROPIC_API_KEY` and
`CHEAPERINFERENCE_API_KEY`, plus
`NUAVE_ANTHROPIC_WORKSPACE_ID` when the Anthropic key is not scoped to a
workspace. `ORDERS=NV-…` and
`ENTRIES=luna-high,haiku-medium` narrow it. Each call is first written to
`spend.json` at its worst case and is refused when that could take the total
past **USD 7** (the hard stop for tests A and B together, raised from USD 5 on
2026-10-27); it is then settled
at its real cost. An entry already written by today's writer is never run
again; move its file out of `runs/` to redo it.
`REPORT_TEST_MAX_OUTPUT_TOKENS=32000` gives that run a bigger output allowance
than production's 16,000 (for a writer cut off at it); the allowance is
recorded with the result.

Once every entry of an order exists from the same writer, letters (A, B, …)
are drawn at random and kept in `key.json`; an entry added after scoring gets
the next free letter, so the scored letters keep their meaning. Do not open it until scoring is
done. Scores in `scores.csv` are kept while the letters stay the same; a sheet
whose letters are redrawn is kept aside as `scores-superseded-<time>.csv`.

## 3a. The reading test (founder decision 2026-10-27)

Two more writers, `luna-high-pages` and `opus-medium-pages`, are their twins
(`luna-high`, `opus-medium`) with the same input plus the pages Firecrawl
read for the order:
- the business's own site, plus up to four of its pages about prices,
  doctors, treatments or the business, found by its site map;
- the ten pages the ChatGPT and Google answers cited most. Social profiles,
  forums and Q&A sites, Google, maps and link shorteners are never read.

They run only when named:

```sh
REPORT_TEST_LIVE=1 ORDERS=NV-3WDSAY ENTRIES=luna-high,opus-medium,luna-high-pages,opus-medium-pages \
  npx vitest run --config vitest.live-provider.config.ts scripts/report-writer-test/run.spec.ts
```

- The first live run that names a page writer reads the pages (needs
  `FIRECRAWL_API_KEY`): at most 16 Firecrawl requests, on the basic proxy.
  It keeps them in `pages/<order>.json`, so later runs never read again.
- When Firecrawl asks it to slow down (429), the reading waits as long as
  asked (30 seconds if not said) and tries again, up to three times.
- If Firecrawl cannot serve (a bad key, no credits, a lasting rate limit, an
  outage) or no page could be read, nothing is kept and no page writer runs,
  so a page writer never spends USD writing a copy of its twin.
- The pages cost Firecrawl credits, not USD, and are not in the ledger; the
  file counts the requests. To read again, move `pages/<order>.json` aside:
  the page writers then count as new writers and run again.
- A run that names some orders (`ORDERS=…`) leaves every other order's
  letters, pairs and scores as they were.

The pairs are blind too: `review-pages/<order>/Pasangan A - 1.pdf` and
`- 2.pdf` are a page writer's report and its twin's in random order, and
`review-pages/key.json` says which is which. A pair is made only when both
come from today's writers. The report without pages in each pair is also one
of the blind set's letters, so **score the blind set before opening the
pairs**.

After Opus medium with pages won the pairs (decision 2026-10-27), Sonnet
5.5 medium and high also run with the same pages (`sonnet-medium-pages`,
`sonnet-high-pages`; they have no pair). The three page reports by Opus
medium and Sonnet medium and high are printed as one blind set,
`review-pages-set/<order>/Laporan A.pdf` … `C.pdf`, once all three exist from
today's writer; `review-pages-set/key.json` says which is which.

## 4. Review

```sh
npx vitest run --config vitest.live-provider.config.ts scripts/report-writer-test/review.spec.ts
```

It starts the app locally and prints each report from the real report page:
`review/<order>/Laporan A.pdf` … `Laporan E.pdf`, and the reference as
`Referensi - laporan yang dikirim.pdf`. Score the lettered ones in `scores.csv`
(1–5: sticks to the evidence, actions specific to this business, natural
Indonesian per `docs/VOICE.md`, clear to an owner; and yes/no: would I send
this to a paying customer?). Then open `key.json`. The `runs/` files give
each entry's cost, calls, wording-fix call, code repairs and cut-off answers.

Pass rule (plan): the writer with the most "yes"; on a tie, the cheaper one.
If Luna high ties Sonnet, keep Luna.
