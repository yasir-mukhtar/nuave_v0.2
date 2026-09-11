# Stage 1 technical summary — protocol-v3

> Generated after the authorized Stage 1 screen. This file is technical evidence only; it is not the blind review entry point and contains no founder marks or acceptance decisions.

## Execution

- Protocol: `protocol-v3`, contract `buyer-decision-v3`
- Fixtures: 8 frozen fixture files; manifest SHA-256 verification passed
- Arms: S one-shot and P planner→realizer
- Model: `gpt-5.6-luna`
- Provider: OpenCode Go Responses API (`https://opencode.ai/zen/go/v1/responses`)
- Settings: low reasoning, default service tier, no web search, `store=false`, fresh call contexts
- Intentional difference: P adds one planner call whose plan is passed to one realizer call; S sends the brief directly to one final writer call. P therefore has two calls and an intermediate plan per pack; all facts, final output schema, language requirements, and review gates are otherwise shared.
- Retries, ranking, repair, replacement runs: none

## Recorded result

| Arm | Pack records | Calls | Completed calls | Failed calls | Input tokens | Output tokens | Total tokens | Sum latency |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| S | 8 | 8 | 8 | 0 | 7,488 | 8,432 | 15,920 | 87,999 ms |
| P | 8 | 16 | 16 | 0 | 19,617 | 15,429 | 35,046 | 140,915 ms |
| **Total** | **16** | **24** | **24** | **0** | **27,105** | **23,861** | **50,966** | **228,914 ms** |

All 16 packs have a recorded raw response, latency, usage metadata, instruction/contract context, and validation result. All 16 packs passed the runner's mechanical output-shape validation with zero validation issues. Cost was not returned by the provider usage payload, so no cost estimate is asserted here.

**Integrity status:** the P planner call was mistakenly sent the final-output schema, so its recorded `raw_plan` is question-shaped rather than a validated intermediate plan. The calls and raw evidence are preserved, but this Stage 1 run is **not valid evidence for the planner→realizer architecture decision**. See `STAGE1-INTEGRITY-BLOCKER.md`. Do not use the review page for founder acceptance or comparative judgment.

## Result locations

- Pack records and raw provider evidence: `experiments/buyer-decision-questions/protocol-v3/results/stage1-*.json`
- Review bundle: `experiments/buyer-decision-questions/protocol-v3/review/data.js`
- Blind review page: `experiments/buyer-decision-questions/protocol-v3/review/index.html`
- Frozen protocol and fixtures: `experiments/buyer-decision-questions/protocol-v3/`

No founder marks, preferences, semantic decisions, or acceptance judgments are present in the delivered review state. No repeated generations have been started.
