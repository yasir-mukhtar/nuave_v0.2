# Which AI model does what, and how to switch

> Updated: 2026-10-28. Code: [`src/lib/audit/models.ts`](../src/lib/audit/models.ts).
> Settings: the deploy job in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

The founder keeps trying new models for step 3 (the paid website reading) and
step 7 (the report writer). This page says how to switch either one. Every
switch changes what customers get, so record it in
[`DECISION_LOG.md`](./DECISION_LOG.md) with the evidence behind it.

## Today

| Step  | Job                                                                    | Model                             | Effort | Setting                                               |
| ----- | ---------------------------------------------------------------------- | --------------------------------- | ------ | ----------------------------------------------------- |
| 3     | Reads the business's own pages (Firecrawl) and drafts the quiz options | GPT-5.6 Luna (OpenAI)             | medium | `NUAVE_READING_MODEL`, `NUAVE_READING_EFFORT`         |
| 5     | Writes the ten questions                                               | GLM 5.3 Flash (Cheaper Inference) | low    | not covered here                                      |
| 7     | Writes the report                                                      | Claude Opus 5.5 (Anthropic)       | medium | `NUAVE_REPORT_WRITER`, `NUAVE_REPORT_EFFORT`          |
| other | The remaining OpenAI calls                                             | GPT-5.6 Luna                      | low    | `OPENAI_AUDIT_MODEL`, `OPENAI_AUDIT_REASONING_EFFORT` |

Step 3 has its own settings, so changing `OPENAI_AUDIT_*` never changes it.
A setting that names a model with no price row stops the step (fail closed).
The cost guard refuses any model it cannot price.

## Switch step 3 to another OpenAI model

1. **Price it.** Add a row to `OPENAI_MODEL_PRICES` in `models.ts`. Copy the
   standard prices per million tokens from the model's page on
   `developers.openai.com/api/docs/models/<model>`: input, cached input,
   cache write and output. Copy them for short and for long requests too, with
   the long-request line (today 272,000 input tokens) and the most input
   tokens. Note the page and the date read above the row. Rows today:
   `gpt-5.6-luna` and `gpt-6-luna`.
2. **Test it** on the same three sites, with no customer involved:

   ```sh
   STEP3_MODELS_LIVE=1 STEP3_PAGES=saved \
   STEP3_MODELS="production-reading,<new key>" \
   npx vitest run --config vitest.live-provider.config.ts \
     scripts/step3-reading-test/models.spec.ts
   ```

   Add the model to the script's `MODELS` list first. Use
   `via: "openai-direct"` with the model name and effort. `STEP3_PAGES=saved`
   reuses the saved pages, so it costs no Firecrawl credit. Results go to
   `.local-evidence/step3-reading-test/`, and the founder's Google Sheet
   "Comparison AI Model Speed" holds the earlier rounds.

3. **Switch it.** In `ci.yml`, change `NUAVE_READING_MODEL` and
   `NUAVE_READING_EFFORT`, and the matching lines in
   `src/lib/orders/wrangler-config.test.ts`. Efforts are `none`, `low`,
   `medium`, `high`, `xhigh` and `max`, if the model supports them. The deploy
   after merge sets them.
4. **Record it** in `DECISION_LOG.md`, and update the table above.

### A non-OpenAI model for step 3 (Claude, DeepSeek, GLM)

This is not wired for customers yet. The test script can already run these
models (`via: "anthropic"` or `via: "cheaper"`), so compare them there first.
Putting one live needs a small adapter like the step 7 writer's
(`anthropic-report.ts`): the same instructions (`extractionRequest`), its own
prices, a spend hold before the call, and a record of each call's cost. Ask
the founder before building it.

## Switch the step 7 report writer

- **Another listed writer:** set `NUAVE_REPORT_WRITER` in `ci.yml` to a row of
  `CLAUDE_WRITERS` in `models.ts`, and update the line in
  `wrangler-config.test.ts`. Rows today: `claude-opus-5-5` (medium effort) and
  `claude-sonnet-5-5` (high effort, cheaper).
- **A new Claude model:** add a row to `CLAUDE_WRITERS` with its effort, its
  output allowance (`maxTokens`) and its prices from claude.com/pricing. Set
  the allowance from a test run's real output: Sonnet at high effort was cut
  off at 16,000 tokens and used 23,901.
- **Another effort for the same writer:** add `NUAVE_REPORT_EFFORT` (`low`,
  `medium`, `high`, `xhigh` or `max`) to the deploy job's settings and to its
  `secrets:` list. A higher effort uses more output, so check the row's
  `maxTokens` against a test run.
- **No setting:** with `NUAVE_REPORT_WRITER` unset, GPT-5.6 Luna writes the
  report and no pages are read for it.
- **Test first** with the report-writer test,
  [`scripts/report-writer-test/README.md`](../scripts/report-writer-test/README.md):
  the same saved orders, each writer judged blind by the founder.

A writer from another provider (not Claude, not OpenAI) needs its own adapter,
like `anthropic-report.ts`. Ask the founder first.

## Checks after any switch

- `npm run check` and the unit tests pass. `src/lib/audit/models.test.ts`
  prices every row.
- After the deploy, the next order's step 3 or report call records the new
  model in its call record (`requested_model` and `returned_model`).
