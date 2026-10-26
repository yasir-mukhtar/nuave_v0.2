# Report-writer test (test B)

Test B of the [audit stack plan](https://claude.ai/artifact/BJ3gmR68chCiczK8CwYFR8)
(decision 2026-10-26): five report writers on the same saved orders, judged
blind by the founder.

| Entry | Writer | Input |
| --- | --- | --- |
| 1 | The delivered report (GPT-5.6 Luna, low effort) | today's |
| 2 | GPT-5.6 Luna, high effort | new |
| 3 | Claude Sonnet 5.5, medium effort | new |
| 4 | Claude Sonnet 5.5, high effort | new |
| 5 | Claude Haiku 5.5, medium effort | new |

"New input" is today's input plus the words of Google's AI Overview for each
question (phone numbers removed, answers longer than 3,000 characters
shortened). Every entry goes through the order runner's own report code, so
all reports get the same checks and repairs.

Everything the test reads and writes stays in the git-ignored
`.local-evidence/report-writer-test/` folder.

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

Needs `OPENAI_API_KEY` and `NUAVE_ANTHROPIC_API_KEY`. `ORDERS=NV-…` and
`ENTRIES=luna-high,haiku-medium` narrow it. Each call is first written to
`spend.json` at its worst case and is refused when that could take the total
past **USD 5** (the hard stop for tests A and B together); it is then settled
at its real cost. A finished entry is never run again; delete its file under
`runs/` to redo it.

Once all five entries of an order exist, letters A–E are drawn at random and
kept in `key.json`. Do not open it until scoring is done.

## 4. Review

```sh
npx vitest run --config vitest.live-provider.config.ts scripts/report-writer-test/review.spec.ts
```

It starts the app locally and prints each report from the real report page:
`review/<order>/Laporan A.pdf` … `Laporan E.pdf`. Score them in `scores.csv`
(1–5: sticks to the evidence, actions specific to this business, natural
Indonesian per `docs/VOICE.md`, clear to an owner; and yes/no: would I send
this to a paying customer?). Then open `key.json`. The `runs/` files give
each entry's cost, calls, wording-fix call, code repairs and cut-off answers.

Pass rule (plan): the writer with the most "yes"; on a tie, the cheaper one.
If Luna high ties Sonnet, keep Luna.
