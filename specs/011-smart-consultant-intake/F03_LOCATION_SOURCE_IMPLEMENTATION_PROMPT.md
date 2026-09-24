# Worker: implement approved official-location discovery offline

Repository: `/Users/hy4-mac-006/nuave_v0.2`.
Role: implementation worker. Deliver one bounded correction to the existing
extraction instructions, with meaningful offline regressions and a reviewable diff.

The founder replied **“approved”** on 2026-09-24 to the revised location-source
package, including its regional-representation limitation. **Implement this
approved scope without repeat approval.** Do not stop at another proposal.
This handoff does not authorize source/provider calls or a live walkthrough.

## Required context, in order

1. `AGENTS.md`, `README.md`, `docs/NOW.md`, `docs/WORKFLOW.md`.
2. `docs/DECISION_LOG.md`: the two 2026-09-24 entries approving broad business
   presence and the location-source implementation.
3. `specs/011-smart-consultant-intake/SPEC.md`: current authority notices,
   **Settled product decisions**, **Scope**, **Non-scope**, **Experience**,
   **Requirements**, **Failure and recovery**, **Evidence, data, privacy, and
   cost**, and **Acceptance criteria**. Read the parent-document sections named
   by its Required context; do not load unrelated history.
4. This package's `F03_LOCATION_SOURCE_PROPOSAL.md` in full: now Approved,
   despite its retained filename. Also read `F03_PRODUCT_CORRECTION_SCOPE.md`
   sections **Product integration boundary**, **Source selection and privacy**,
   **Failure behavior and customer copy**, **Output facts and provenance**, and
   **Files and regression boundary**, including the 2026-09-24 amendments.
5. `F03_PRODUCT_CORRECTION_REVIEW_2.md`: **Independent checks** and **Evidence
   and preservation**, for the existing verified baseline and isolated gate
   method. Prior checks are evidence, not substitutes for this change's checks.
6. Relevant installed Next.js guides under `node_modules/next/dist/docs/`
   before writing code, as required by `AGENTS.md`.

Inspect the extraction functions and focused tests in `src/lib/audit/openai.ts`
and `gemini.ts`; then only the directly relevant schema, request/reservation,
retry, active extraction route, intake mapping/summary and downstream context
consumers needed to verify the contract. Do not execute old handoffs or read
secrets, raw provider responses, saved customer sessions, private evidence,
`archive/` or unrelated drafts. Use fictional fixtures only. No website refetch
or retained private source note is needed to implement these generic rules.

## Preserve the current baseline

This continues the approved Spec 011 implementation. At handoff the dedicated
branch is `devin/sol-smart-consultant-intake-plan`, HEAD
`2a21f856d33264887df6287f9b6d9dd22468fea5`, with an empty index and substantial
expected uncommitted work. Verify branch, HEAD, status and index before editing.
Follow the repository's branch/base rules without resetting, stashing, cleaning
or switching this shared checkout. If a newer base must be integrated, use an
isolated dedicated branch/copy and preserve the complete reviewed tracked and
untracked Spec 011 baseline; report base changes and conflicts explicitly.
Do not discard accepted work to obtain a clean tree.

Inventory/hash existing product files and protected notes before editing;
compare the final task delta with this starting state, not only with HEAD.
Preserve prior excerpt/selector corrections, F-01 print changes, existing
regressions and unrelated work. Verify the four protected-note hashes against
the table in `F03_CONTROLLED_INPUT_WORKER_PROMPT.md` under **Checkout and
preservation**; read that table only, never execute the consumed diagnostic.
Stop the affected work on an unexplained checkout/hash mismatch or concurrent
change; do not repair evidence or silently overwrite another worker's edits.

## Implement

1. Amend the existing extraction instructions in OpenAI and testing-only Gemini.
   Use homepage evidence first; if current reach is unsupported or ambiguous,
   direct existing official-domain search toward relevant official locations or
   service-area evidence. Search using supplied identity/domain and generic
   intent, never a guessed path or business-specific URL. Instruct selection of
   at most one relevant canonical-host page (`www` equivalence allowed), with
   actual evidence URLs. Keep candidate ambiguity unknown; no merged partial
   directories, branch-by-branch crawl or additional server fetch/model call.
2. Apply the approved broad-presence definitions exactly. Published operating
   locations support premises-based presence; delivery claims need coverage
   evidence. Supported national presence uses `seluruh` with no active city list;
   supported Indonesia-and-abroad presence uses `luar`. A contact address,
   aspiration, unexplained count, foreign-sounding name or overflowing list
   alone does not establish broader reach. National presence never manufactures
   universal delivery. Ordering online does not alone mean service used online.
3. For local/regional presence, retain faithful source-supported geographic
   areas, using published broader descriptions only when supported. If a
   genuinely regional footprint cannot fit eight such areas and no faithful
   published broader description exists, retain supported reach and leave areas
   unresolved. Preserve existing inline correction and disabled confirmation
   until required meaning is supplied. Never select an arbitrary eight-city
   subset, invent a region, broaden reach to satisfy validation or change focus.
4. Exempt `market_areas` from generic four-item retry shortening so a supported
   five-to-eight-area description survives an eligible technical retry. Keep
   retry eligibility/ceilings unchanged: valid partial or optional-empty output
   never triggers another attempt. Construct the complete amended initial and
   retry requests before budget reservation; reuse the same homepage excerpt.
5. Preserve origins and customer authority: unchanged extracted geography stays
   `Dari website Anda`, default whole-brand focus stays `Saran Nuave`, edited
   rows become `Dari Anda`, and nothing is confirmed before the existing action.
   Optional target customer remains empty when unsupported and never blocks.

Allowed runtime edits: the extraction instruction text and associated retry
instruction in `src/lib/audit/openai.ts`, and matching extraction instructions
in `src/lib/audit/gemini.ts`. Add/update their focused tests and relevant
`smart-source-preparation.test.tsx`, `smart-intake-contract.test.ts` or existing
downstream context/export regression tests when needed. Avoid refactoring or
introducing a shared prompt framework. Any other runtime change requires a
concrete finding returned to the orchestrator before expanding this scope.

Preserve schemas, runtime UI/mapping, fetcher/selector, safety/rate/privacy
controls, exact non-extraction provider messages, source disclosure, cost limits,
direct-ten questions, report/export contracts, v1 historical hold and the sole
emergency switch. Do not change dependencies, models, tool configuration,
timeouts, provider roles or application call counts. Requested hosted-search
limits are advisory; do not claim hard page/time enforcement or a successful
live extraction from mocked results.

## Validation and deliverable

Capture the existing failure in a meaningful regression before the smallest
fix where practical. Inspect actual initial/retry request payloads, reservation
ordering, provider parity and unchanged settings. Cover fictional cases for:

- one local area; six regional areas retained through eligible technical retry;
- many outlets expressed as two explicitly published regions;
- a supported national network with no active city list and unchanged local
  delivery meaning, exact origins and confirmation behavior;
- the accepted unrepresentable regional case with required areas unresolved;
- aspiration/contact/count-only unknowns and optional customer absence;
- no added application fetch/request, no valid-partial retry, preserved ledger,
  source/rate/privacy failures and Back/reload without replay.

Reuse existing protections/tests where they already cover the invariant. Check
that confirmed reach/channel meaning survives the existing writer, report and
export context without manufacturing universal delivery; do not change their
contracts or protected instructions. Return a specific downstream conflict if
one prevents that meaning from being preserved. An assertion on prompt wording
or a mocked model answer is not proof the real model finds or interprets sources.

Run focused regressions, `npm run validate:fast`, and canonical `npm run verify`
offline with dummy provider credentials. The shared tree has a known lint
obstruction from ignored evidence artifacts: use a fresh matching product copy
outside it if needed, include all relevant tracked/untracked product files,
verify copy hashes, and copy no credentials/private evidence. Do not delete
evidence or weaken lint/test settings to obtain green gates. Record the exact
environment and actual results; prior PASS is not this change's PASS.

Inspect the complete task diff, verify preservation and `git diff --check`, and
remove temporary diagnostics/bypasses. Write
`specs/011-smart-consultant-intake/F03_LOCATION_SOURCE_IMPLEMENTATION_RESULT.md`
with the task delta, changed files, checks/results, evidence paths/hashes,
remaining limits and instructions for independent review. Update only the
relevant sections of `ACCEPTANCE_EVIDENCE.md`, `VERIFICATION.md` and `docs/NOW.md`
to report actual status; do not relabel worker checks as independent review.

No live source/provider calls, Periksa, live confirmation, consumed-run reruns,
staging, commits, pushes, merge, deployment or publication. Do not dispatch a
reviewer from this worker task. F-01 remains closed; F-03/AC-07 remain open;
Spec 011 remains Approved, not Verified. Accounting stays USD 1.04786450 of 5,
including historical carryover, because this task is offline.

Return the result path, implementation outcome, changed files, actual validation,
any concrete blockers and next smallest action: independent review before a
separately authorized live preparation. Do not request approvals already settled.
