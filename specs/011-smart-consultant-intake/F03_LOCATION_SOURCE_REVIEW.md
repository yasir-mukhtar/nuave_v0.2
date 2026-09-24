# F-03 location-source correction — independent review

2026-09-24. Reviewed the completed task against its preserved starting working
tree and the approved location-source package. Branch:
`devin/sol-smart-consultant-intake-plan`; HEAD:
`2a21f856d33264887df6287f9b6d9dd22468fea5`.

## Findings

**No actionable finding.** No severity, failing reproduction or corrective
implementation change is assigned. The inspected delta satisfies the bounded
offline instruction correction. This finding does not establish successful live
source discovery or geographic interpretation.

The review used the [implementation handoff](./F03_LOCATION_SOURCE_IMPLEMENTATION_PROMPT.md),
[result](./F03_LOCATION_SOURCE_IMPLEMENTATION_RESULT.md), approved
[proposal](./F03_LOCATION_SOURCE_PROPOSAL.md), amended Spec 011 and correction
scope, governing repository documents and the prior independent review. The
founder's permission to finish on the preserved baseline governs this review;
main integration was not attempted.

## Code and contract checks

- **Bounded discovery and meanings:** `src/lib/audit/openai.ts:349–355` and
  `src/lib/audit/gemini.ts:271–277` contain the same geographic instructions.
  They prioritize homepage evidence, then relevant official location/coverage
  evidence using supplied identity/domain and generic intent. They require one
  selected canonical-host page, actual evidence URLs and unresolved ambiguity;
  they prohibit guessed paths, merged partial directories and branch crawling.
  National/international presence has empty active areas. Contact, aspiration,
  unexplained count, foreign names and overflow cannot establish broader reach.
  Delivery coverage requires its own evidence; online ordering is not online
  service use. Regional overflow retains supported reach with areas unresolved.
- **Exact runtime boundary and settings:** independently reconstructed the
  five-file implementation patch from the retained baseline and current files;
  it matches the worker patch byte for byte. Independently compared both runtime
  files: only the seven instruction strings in each adapter and the OpenAI
  retry string changed. All other bytes are unchanged. OpenAI request settings
  at `openai.ts:317–336` retain model selection, low reasoning, `store: false`,
  default tier, 16,000 output tokens, one tool call, official-domain filtering,
  medium search context, required search, source inclusion and structured output.
  Testing-only Gemini keeps its existing tools/settings and authority.
- **Retry and accounting:** `openai.ts:292` exempts `market_areas` from the
  four-item shortening rule while retaining its eight-area limit. Complete
  requests still precede reservation at `openai.ts:395–404`; dispatch follows
  reservation. Retry eligibility remains missing parsed output, at most one
  retry, with output-limit brevity only for that completion reason
  (`openai.ts:447–460`). Existing initial failure, valid partial/empty output,
  prior ledger, carryover, stage ceiling and failed-attempt accounting behavior
  is unchanged. Retry reuses the same excerpt without another document read.
- **Privacy and source failures:** the extraction route, selector, safe fetcher,
  schemas and persistence code are unchanged from the starting tree. Reran
  regressions for server-owned input and caller-text rejection, byte/host/DNS/
  redirect/deadline limits, sensitive-content blocking, unavailable rate bindings,
  no raw-source storage/export and source-status restoration. Safe readable
  no-text continues without supplemental data; unsafe, unreadable, sensitive
  and rate failures still stop before extraction. Identity/icon, synthetic and
  Instagram behavior remain protected.
- **Preparation, confirmation and downstream meaning:** the seven new cases at
  `src/lib/intake/smart-source-preparation.test.tsx:307–465` exercise local,
  regional, national, international and unresolved outcomes through intercepted
  transports. They check exact proposals/origins, source links, empty optional
  customer context, reload without replay, request counts and explicit
  confirmation. `smart-intake-contract.ts:310–327` still blocks missing required
  areas; `:375–380` clears active areas for broad reach. The new regressions at
  `smart-intake-contract.test.ts:58–141` preserve confirmed values and origins
  through projection, writer, report context and export, and preserve owner
  provenance after regional correction. No downstream runtime contract changed.

## Independently executed checks

| Check | Reviewer result |
|---|---|
| Eleven focused suites | **PASS — 259 tests.** |
| `npm run validate:fast` | **PASS — 1,244 tests in 90 suites**, typecheck, lint, formatting and typography. |
| Canonical `npm run verify` | **PASS — exit 0**, 1,244 tests, Next and Cloudflare/OpenNext builds, 28 enabled plus 3 disabled browser checks; `Offline verification passed.` |
| Lint | Zero errors; the same 23 existing warnings. No lint-policy changes. |
| Preservation and whitespace | All 316 product hashes match after gates; all 586 review-start inventory entries unchanged; `git diff --check` passes; index empty. |

The focused suites were `source-excerpt`, `safe-source-fetch`, `source-identity`,
`local-preparation-routes`, `website-input`, `openai`, `gemini`,
`smart-source-preparation`, `smart-journey`, `smart-intake-contract` and
`customer-evidence-export`. The first reviewer invocation selected only five
suites because six paths were incorrect: 85 tests passed. Its log is retained;
the corrected complete eleven-suite invocation passed all 259 tests.

Execution used a fresh matching copy at
`/private/tmp/nuave-f03-location-review-8vty0q94/product/`, Darwin arm64,
Node 22.23.2 and npm 10.9.8. Installed dependencies were cloned without download.
The environment was cleared, provider credentials were fictional or blank,
live provider testing was disabled, and browser servers used synthetic mode on
loopback. The canonical verifier's temporary production environment file was
restored to its original absent state. No credentials, private payloads or
archive content were copied or inspected.

The known shared-tree lint obstruction was avoided with the matching copy.
Shared-tree lint was not rerun or claimed to pass; retained evidence and lint
policy remain intact. No old diagnostic prompt or live runner was executed.

## Evidence and preservation

Worker evidence remains under `/private/tmp/nuave-f03-location-j1557mch/`.
All **17 recorded artifact hashes match**, including the patch and gate logs.
The logs independently inspected report the worker's 259 focused tests,
1,244 broad tests, both builds and 31 browser checks. Their pre-fix failures and
environment-related earlier attempts remain worker-reported executions; this
review did not rerun the pre-fix state.

The worker's 585-entry starting inventory shows exactly eight modified existing
files: two runtime files, three test files and three status records. Its result
is the sole added file. The subsequent result/NOW edits match
`baseline-confirmation.json`. All 319 retained baseline file copies match their
starting hashes; other preservation entries are hash inventories. All 316
candidate product files match the shared tree, worker copy and fresh reviewer
copy. No tracked or untracked product file in `src`, `tests`, `scripts`, `public`
or `.github` is omitted. Existing print, selector and unrelated edits remain.

All four protected-note hashes match the prescribed table; each note remains
untracked and unstaged. Both prior product-correction reviews remain unchanged.
Branch, HEAD, upstream `194f0f44e7f6c7f8bc3270b97a2ac9f887b830e4` and the empty
index are preserved. The reviewer adds only this review file in the repository.

Independent evidence is retained at
`/private/tmp/nuave-f03-location-review-8vty0q94/`, including the reconstructed
patch, copy manifest, boundary checks, preservation comparisons and gate logs.

| Reviewer artifact | SHA-256 |
|---|---|
| `focused.log` | `c249747a1e7f754dfc641962439245662ba981f978ab5a08ed59f5240921889a` |
| `validate-fast.log` | `8b77336af30c8d634468a054988be35a9941955925fc3f8ab729ee874c355da0` |
| `verify.log` | `9e50c6533a7dfac0375b92a99f7b4732f376f474c7300af41eea905a4d530760` |
| `offline-copy.json` | `add92b464b472c5de8954e8d80f737c30009b7c6622abbe0202b51ea11dc2deb` |

## Limitations and verdict

**PASS for this bounded offline correction on preserved baseline `2a21f85`.**

Mocked model outputs establish request/application behavior, not that hosted
search finds the right live page or interprets its geography faithfully. The
requested hosted page/tool limits remain advisory. The unchanged writer uses
`Area layanan` for broad reach (`questions-id-direct-ten.ts:91–99`) and lists
channels separately. Deterministic projection/export adds no universal-delivery
claim, but the context does not encode a geographic boundary for each channel;
these checks cannot establish what a later model will infer. The accepted
unrepresentable regional case still requires customer input.

No remote/main integration check was rerun. The worker-recorded current-main
report conflicts remain separate work, and this PASS does not establish PR
readiness against main. No live fetch/provider call, live confirmation, staging,
commit, push or deployment occurred. Recorded accounting remains
USD 1.04786450 of 5; this review adds no provider spend.

Next smallest action: separately authorize the preparation-only founder
walkthrough and assess actual discovery, proposals and desktop/mobile meaning.
This review grants no live allowance. **F-01 remains closed; F-03/AC-07 remain
open; Spec 011 remains Approved, not Verified.**
