# F-03 product correction — implementation result

Date: 2026-09-23. Initial review returned **REVISE**; the subsequent
[independent re-review](./F03_PRODUCT_CORRECTION_REVIEW_2.md) is **PASS** for the
corrected bounded offline implementation. Details and next action are below.
Authority: [approved scope](./F03_PRODUCT_CORRECTION_SCOPE.md) and
[implementation prompt](./F03_PRODUCT_CORRECTION_IMPLEMENTATION_PROMPT.md).

**Implemented. Offline product gates pass in an exact verification copy.**
The shared-tree lint obstruction below remains; this is not an acceptance closeout.

## Checkout and scope

- Branch: `devin/sol-smart-consultant-intake-plan`.
- HEAD: `2a21f856d33264887df6287f9b6d9dd22468fea5`.
- Existing working tree used; no checkout change, fetch, reset, stash, staging,
  commit, push, PR, deployment or publication.
- No live website/provider calls or consumed diagnostic rerun. New fixtures are
  fictional. No credentials or private live payloads were opened or copied.
- **F-01 remains closed; F-03/AC-07 remain open; Spec 011 remains Approved,
  not Verified.** The previous founder rejection remains the latest live product
  judgment. This implementation does not establish the original failure's cause.

## Implemented behavior

The real Smart preparation now performs one additional server-owned document
read inside `/api/audit/extract`, after the existing switch, caller limit,
mode/credential and input checks. Identity retains its original head/icon
behavior. Both production aliases use the same excerpt path. Instagram,
synthetic preparation and testing-only adapters retain their prior methods;
adapters that do not consume the excerpt report `not-attempted`.

The reader opts into document mode on the existing safe fetch. Its 512 KiB
decoded-byte cap, five-second request/ten-second total deadlines, three-redirect
limit, public DNS/destination checks and per-hop destination charging remain.
Missing production bindings fail closed. Unrelated final hosts are rejected;
the accepted same-domain `www` form retains its actual final URL and retrieval
time. There is no crawl, discovered-page read, JavaScript execution or added
fetch retry.

The deterministic selector takes whole heading, paragraph and list blocks,
preferring main/article content, then eligible body content. It keeps document
order, deduplicates, preserves literal wording and caps the result at 8,000 UTF-8
bytes. Explicit hidden/contact/profile/testimonial/form/navigation/embedded
content is excluded. All candidate blocks are screened before size selection,
including oversized candidates and contact blocks; detected sensitive records
or credentials stop preparation. Ordinary contact blocks are omitted. Excessive
nesting and invalid UTF-8 fail as unreadable instead of corrupting text.

Only the server constructs `public_source_data`. Unknown caller-supplied text,
URL, time and status fields cannot establish it. The complete user JSON reaches
the original budget reservation and SDK. Removing only the supplemental field
restores request equivalence: developer instructions, output schema, model,
reasoning, hosted search, includes and token settings are unchanged. Prior
ledger, configured carryover and limits remain intact. An existing permitted
technical retry reuses the same in-memory excerpt without another fetch.

Readable pages with no usable excerpt continue the existing extraction with
the exact approved nonblocking notice. Source failures stop before paid work;
safe entry, validated identity and the ledger survive. Extraction failure after
a successful read retains `included` separately from failed-call telemetry.
The optional typed status restores the no-text notice and source errors across
Back/reload without replay. Missing status in old v2 sessions means unknown.

No excerpt/HTML/diagnostic object is added to storage, logs, analytics, confirmed
facts, frozen context, writer input, audit records or exports. Existing prepared
proposal origins, source disclosure, owner correction and confirmation remain;
there is no per-offering excerpt-match gate or verification claim.

## Files changed in this task

Product:

- `src/lib/audit/safe-source-fetch.ts` — opt-in bounded document mode.
- `src/lib/audit/source-excerpt.ts` — new static selector and server fetch wrapper.
- `src/app/api/audit/extract/route.ts` — gated source step and distinct outcomes.
- `src/lib/audit/openai.ts` — internal typed user-data extension before reservation.
- `src/lib/audit/types.ts` — internal payload/status types and approved copy.
- `src/lib/intake/SmartIntakeJourney.tsx` — minimal status handling and safe restore.
- `src/lib/intake/SmartSummary.tsx` — accessible no-text notice.
- `src/lib/intake/smart-session.ts` — optional enum validation; no version change.

Tests:

- `src/lib/audit/source-excerpt.test.ts` — new fictional selection/privacy/fetch cases.
- `src/lib/intake/smart-source-preparation.test.tsx` — new real UI/route/provider/SDK
  integration with fictional HTTP, DNS and Worker bindings.
- `src/lib/audit/safe-source-fetch.test.ts` — default head versus document regression.
- `src/lib/audit/local-preparation-routes.test.ts` — offline source mock and truthful
  testing-adapter status checks.
- `src/lib/audit/website-input.test.ts` — offline source mock for existing route cases.

Records: this new untracked report, `ACCEPTANCE_EVIDENCE.md`, `VERIFICATION.md`
and `docs/NOW.md`. Existing approved spec/decision/scope/handoff edits are preserved.
No dependency, prompt, retrieval provider, runtime diagnostic runner or temporary
product switch was added. Existing `openai.test.ts` and print CSS edits are
byte-for-byte unchanged from this task's starting tree.

## Offline checks and attribution

| Check | Actual worker result |
|---|---|
| Focused regressions in the shared working tree | **PASS — 211 tests, nine suites.** |
| `npm run validate:fast`, isolated exact product copy | **PASS — 1,210 tests, 90 suites; type/lint/format/typography pass.** Lint has 23 existing warnings, no errors. |
| `npm run verify`, same isolated copy | **PASS — all checks, 1,210 tests, Next production build, Cloudflare production bundle, 28 enabled + three disabled browser checks.** Exit 0 and `Offline verification passed.` |
| Preservation | 298 initial hashes: 288 unchanged; ten approved existing source/test files changed; none missing. Three new source/test files are additional. |
| Exact verification copy | All 316 selected product/test/script/config/public/workflow files match working-tree hashes. |
| Protected notes | All four approved hashes match; notes remain untracked and unstaged. |
| Final handover | Branch/HEAD/local upstream unchanged; empty index; `git diff --check` passes. |

The **shared-tree `validate:fast` did not pass**: its broad `eslint .` traversed
retained Git-ignored diagnostic bundles and reported 53 `no-require-imports`
errors there. It also scanned an ignored historical script under `.secrets`;
no private payload was inspected or copied. Those artifacts and the lint
configuration were left untouched. The full gates instead use an isolated copy
of the current product, with existing installed dependencies, excluding private
evidence, credentials, archive, Git metadata and historical documentation. This
is an explicit verification-environment limitation, not a claim that the command
passes in the shared tree as it stands. No product files or checks were omitted.

Early isolated attempts exposed a formatting difference and then three
existing loopback-server tests blocked by sandbox `EPERM`. Formatting was fixed
in the real tree and synchronized with new hashes; the unchanged gates were
rerun with local-server execution permission. Credentials are dummy/blank and
telemetry is disabled. The canonical verifier's temporary build environment is
created/restored only in that copy; original credential files are untouched.
The first `verify` then passed checks/tests but Turbopack rejected the dependency
symlink outside its filesystem root. Replacing it with a local clone of the
already installed dependencies resolved that environment error. No dependency
install, network download, code/configuration workaround or skipped check was
used. The subsequent complete `verify` passed, including both builds and all
31 browser checks. Earlier failures remain in separate logs.

Focused red-to-green records cover the initial head-only body loss, static
privacy/encoding/nesting boundaries, a business `menu` incorrectly excluded
as navigation, and nested list/paragraph content moved out of literal order.
Nested content now stays in its enclosing complete block; business menus remain
eligible while navigation stays excluded. Both required gates were rerun and
passed after the final nested-block correction. Early integration failures were
test harness issues (Node SDK/typed-array realm in jsdom and incorrect UI queries),
fixed only in tests.
The SDK browser-environment exception exists exclusively in the test mock, never
in product code.

New integration assertions cover one Periksa through real identity/extraction
handlers and the SDK parser, exact supported summary values, sparse unknowns,
origin correction, source links, caller injection, both production aliases,
reservation/request equivalence, ledger/carryover/stage exhaustion, failed-call
accounting, technical retry reuse, no-text continuation, source/privacy/rate
errors and reload without replay. The full suites retain the existing v2 locks,
historical hold, report recovery and downstream export protections.

## Local verification artifacts

Owner-only, Git-ignored evidence directory:

`/Users/hy4-mac-006/nuave_v0.2/acceptance-review-2026-09-22/f03-product-correction/`

- `focused-final.log`
- `validate-fast.log` — initial shared-tree lint obstruction.
- `validate-fast-isolated.log` — final exact-copy fast gate.
- `verify-isolated.log` — canonical offline verification.
- `preservation-before.json`, `preservation-check.json` — current-task inventory.
- `offline-copy.json` — exact copy path and per-file hashes.
- `artifact-hashes.json` — final log/manifest hashes.
- `baseline/` — pre-task public product source snapshots, suffixed `.snapshot`.
- Earlier failed test/gate logs retain the red-to-green and environment history.

Verification copy: `/private/tmp/nuave-f03-offline-dw4b45te`.
No old private diagnostic evidence, source passage, provider response, PDF or
live screenshot was opened, copied, rerendered or rewritten for this correction.

## Remaining limits and next action

This is static HTML selection, not browser rendering. It recognizes explicit
hidden markers/inline visibility and conventional personal/contact containers;
it does not resolve arbitrary external CSS, execute JavaScript or guarantee
perfect personal-data classification. Unknown named entities remain literal;
unsupported byte encodings fail safely. Some valid facts can be omitted, and
safe no-text pages retain the approved hosted-search fallback and notice.

Mocks prove application input delivery and control behavior, not provider-side
receipt, model factual accuracy or a complete live prepared summary. Hosted
search remains active, so the excerpt is not an exclusive source record.
Unknown channel/reach/area values remain unknown. Historical source-access versus
extraction failure remains unresolved. No refreshed founder judgment, live
desktop/mobile walkthrough, rendered PDF review, native save-dialog check,
external hyperlink check or physical-mobile use is claimed here.

### Reviewer instructions

Review the current correction against the approved scope and amended Spec 011;
do not execute the old diagnostic prompts. Confirm branch/HEAD, empty index,
the four protected hashes and preservation of earlier CSS/test edits. Inspect
all thirteen changed/new product and test files, including untracked files.
Check the source selector, no-text/privacy/rate behavior, server ownership,
unchanged extraction request settings, accounting, retry reuse and metadata
separation. Independently run the focused checks and report which broad gates
you actually repeat. Inspect the exact-copy manifest and shared-tree lint
limitation rather than treating worker gate results as independent evidence.
If a pass in this particular shared-tree directory is required, the smallest
separate housekeeping action is to approve lint discovery exclusions for its
already ignored private/diagnostic artifact directories. This worker did not
change lint policy or relocate/delete retained evidence.

Return actionable findings with file/line references and an explicit product
revision verdict. A pass on this bounded implementation does not close F-03 or
AC-07. After independent review passes, prepare the separately authorized founder
walkthrough with an honest source/required-meaning plan, one tab at desktop/mobile
sizes and a stop before confirmation/question generation. No live work or
publication is authorized by this report.

## Two selector findings corrected — 2026-09-23

The [independent review](./F03_PRODUCT_CORRECTION_REVIEW.md) reproduced two
medium findings despite passing the original offline suites: zero-opacity
variants and explicitly labelled customer reviews entered the excerpt. That
review remains unchanged. This section records the implementation response,
not an independent re-review or refreshed founder judgment.

Only three product/test files changed from the reviewed working tree:

- `src/lib/audit/source-excerpt.ts`: match the complete numeric-zero opacity
  declaration, including decimals and `!important`; keep nonzero opacity and
  unrelated properties eligible. Exclude conventional `review`/`reviews`
  tokens in the existing class/id/accessible-label matcher.
- `src/lib/audit/source-excerpt.test.ts`: fictional zero/nonzero, inherited
  hiding, class/id/accessible-label review exclusions, empty-page outcomes and
  ordinary business-description/`preview` controls.
- `src/lib/intake/smart-source-preparation.test.tsx`: extend the existing
  no-text integration to hidden-only and reviews-only pages. Each continues
  extraction once without supplemental source data, restores the approved
  notice/status across Back/reload and does not replay work.

The new tests ran before the fix: **15 failed, 71 passed**, reproducing the
exclusions and related opacity false positives. After the fix, both suites
pass **86 tests**. The nine focused suites pass **233 tests**. The reviewer’s
unchanged seven standalone assertions also pass against a freshly built selector;
this rerun was performed by the implementation worker.

Both required broad gates pass in a fresh isolated copy:

- `npm run validate:fast`: **PASS**, type/lint/format/typography checks and
  **1,232 tests in 90 suites**.
- `npm run verify`: **PASS**, the same checks and tests, both Next/Cloudflare
  production builds and **31 browser checks** (28 enabled, three disabled).
  Exit 0 with `Offline verification passed.`

All **316** product/test/script/configuration/workflow/public files match the
working tree. The existing local-server tests and browser checks ran with local
execution permission. The shared-tree lint obstruction remains; no lint policy
or retained diagnostic evidence was changed. These are worker gate results.

Revision evidence: `/private/tmp/nuave-f03-selector-revision-zv5n7vte/`.
It contains the pre-fix public snapshots and hashes, red/green/focused logs,
reviewer-assertion rerun and exact-copy manifest. The verification product is
its `product/` directory, using a local clone of existing dependencies and a
clean environment; no dependency install, credential copy or live call occurs.

Final preservation: **476 of 483** pre-revision public file hashes are unchanged;
the only differences are the three listed product/test files and four records:
this result, `ACCEPTANCE_EVIDENCE.md`, `VERIFICATION.md` and `docs/NOW.md`.
The four protected notes, earlier print CSS/extraction tests and independent
review remain unchanged. Branch/HEAD/upstream and empty index are preserved;
`git diff --check` passes. `preservation-after.json`, `revision.patch` and
`artifact-hashes.json` record the final inventory, complete revision diff and
evidence hashes. No temporary bundle or diagnostic script was added to the repo.

Subsequent independent re-review: **PASS**, with both findings resolved and no
additional findings. The reviewer independently repeated all seven original
assertions, 233 focused tests and both broad gates (1,232 tests, both builds,
31 browser checks) in a matching copy. The [re-review record](./F03_PRODUCT_CORRECTION_REVIEW_2.md)
keeps this attribution distinct from the worker evidence above.

Subsequently, the founder separately authorized the
[preparation walkthrough](./F03_FOUNDER_WALKTHROUGH.md). Its one live Periksa is
complete, with desktop/mobile observations recorded in
[acceptance evidence](./ACCEPTANCE_EVIDENCE.md#2026-09-23-refreshed-live-preparation-executed).
The founder's 2026-09-24 review finds completeness lacking and everything else
acceptable. Next: independent review of that gap and the retained acceptance
limits, followed by the smallest evidence-supported correction.
The allowance is consumed and final confirmation was not pressed.
F-01 remains closed; F-03/AC-07 remain open; Spec 011 stays Approved, not Verified.
No staging, commit, push, publication or deployment is part of this revision.
