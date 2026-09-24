# F-03 product correction — independent review

Date: 2026-09-23. Reviewed the current uncommitted working tree on
`devin/sol-smart-consultant-intake-plan`, HEAD
`2a21f856d33264887df6287f9b6d9dd22468fea5`, against the approved
[correction scope](./F03_PRODUCT_CORRECTION_SCOPE.md) and amended
[Spec 011](./SPEC.md). This is an independent offline review, not a new live
acceptance judgment.

## Findings

### 1. P2 / Medium — explicit zero-opacity variants enter the excerpt

**Location:** [source-excerpt.ts](../../src/lib/audit/source-excerpt.ts),
lines 204–215, especially line 213.

The inline visibility check recognizes `opacity:0` only when the zero is followed
by whitespace, a semicolon or the end of the value. Valid zero-opacity forms
`opacity:0.0`, `opacity:.0` and `opacity:0!important` therefore remain eligible.
Independent fictional assertions reproduce all three: a transparent paragraph
containing `Penanda tersembunyi fiktif.` is selected alongside the visible
`Roti bakar.` paragraph. The expected excerpt contains only the latter.

This violates the approved visible-text/hidden-content boundary. Hidden wording
can reach the extraction model as source data; a page containing only such a
block would also be classified as `included` instead of `no-usable-text`. This
is an explicit inline style, not the acknowledged limitation around external
CSS or JavaScript rendering.

**Smallest correction:** recognize numeric zero opacity, including decimal forms
and an optional `!important` suffix, without excluding nonzero opacity. Add these
fictional cases to the source selector regressions, including a hidden-only page
that produces the approved no-text continuation.

### 2. P2 / Medium — explicitly labelled customer reviews are selected

**Location:** [source-excerpt.ts](../../src/lib/audit/source-excerpt.ts),
lines 117–118 and 203–212.

The exclusion matcher recognizes `testimonials` and `comments`, but not
`review`/`reviews`. A fictional
`<section class="customer-reviews" aria-label="Customer reviews">` containing
`<p>Pelanggan Fiksi: roti ini kesukaan saya.</p>` is included in the excerpt.
The matching `customer-testimonials` control is correctly excluded. Reproduction
uses only the existing selector, without a provider or network call.

The approved scope excludes testimonials and unrelated customer content. This
explicitly labelled equivalent currently sends unnecessary customer commentary
to the model and can compete with the intended business description for the
8,000-byte allowance. No actual personal data was used to demonstrate the gap.

**Smallest correction:** extend the conventional review-container exclusion to
explicit customer-review markers such as this one, with fictional regressions
for both class and accessible-label identification. Keep ordinary business
description blocks eligible; no model-based classification or new scraper is
needed.

## Checks performed independently

Read `AGENTS.md`, `README.md`, `docs/NOW.md`, `docs/WORKFLOW.md`, the spec, approved
scope and implementation result, plus the relevant product/design/audit sections.
Inspected all thirteen correction source/test files, including the three
untracked files, and the preserved earlier CSS and extraction-test diffs.

| Check | Independent result |
|---|---|
| Focused regressions | **PASS:** 211 tests in nine suites. |
| Additional fictional selector assertions | **REPRODUCED:** four failures across the two findings above; three control assertions pass. These are reviewer assertions, separate from the repository's existing suite. |
| `npm run validate:fast` | **PASS in matching isolated copy:** 1,210 tests in 90 suites; type, lint, format and typography checks pass. Lint retains 23 warnings and zero errors. |
| `npm run verify` | **PASS in the same matching copy:** exit 0, 1,210 tests in 90 suites, Next production build, Cloudflare production bundle, 28 enabled plus three disabled browser checks, and `Offline verification passed.` |
| Shared-tree diff whitespace | `git diff --check` passes. |

The nine focused suites were `source-excerpt`, `safe-source-fetch`,
`source-identity`, `local-preparation-routes`, `website-input`, `openai`,
`smart-source-preparation`, `smart-journey` and `smart-intake-contract`.

Static review and the independently repeated tests establish the following
within their mocked/offline boundary:

- Only server-selected text establishes `public_source_data`. Caller-injected
  text/status/source/time does not replace it. Actual final URL, time and the
  complete user JSON reach the original reservation and SDK dispatch. The
  historical diff and request-equivalence assertion show unchanged developer
  instructions, schema, model/reasoning, hosted-search settings, includes and
  token limits apart from the supplemental user data.
- Both production aliases use the same extractor. Identity/head/icon behavior,
  Instagram and synthetic preparation remain intact; testing-only adapters
  report `not-attempted`. Production binding failures remain closed. Document
  reads retain the byte, timeout, redirect, public-destination and per-hop
  charging controls, and unrelated final hosts are rejected.
- Existing candidate-screening, whole-block byte limits and sensitive-content
  errors pass their regressions. The two exclusion gaps above remain material
  exceptions; this review does not call the selector privacy-complete.
- Safe no-text pages continue without a fake source-data object and show the
  approved accessible notice. Source/privacy/rate failures block paid work.
  Source outcome stays separate from extraction failure telemetry; prior ledger,
  configured carryover and stage/cost limits survive. Permitted technical retry
  reuses the excerpt without another read; valid empty output adds no retry.
- The real Smart UI → route → provider → SDK test path preserves supported
  proposals and unknowns, source disclosure and owner correction. Back/reload
  preserves the notice or source failure without replay. No per-offering
  excerpt-matching gate or independent-verification claim was introduced.
- The new raw text/HTML object is not added to persistence, logging, analytics,
  confirmed/frozen input, writer context, saved audit context or exports. The
  optional enum remains preparation metadata. No downstream contract or
  historical-hold changes occur in this correction.

## Verification environment and preservation

The worker's retained gate logs were inspected and their hashes checked, not
treated as independent executions. All **25** recorded artifact hashes match.
The worker logs report 211 focused tests, 1,210 broad tests, both production builds
and 28 enabled plus three disabled browser checks. The retained shared-tree
`validate:fast` log ends with **53 lint errors and 127 warnings**, including the
reported ignored diagnostic bundles. Those files and lint policy were not
changed, relocated or deleted. No private payload or credential file was opened.

All **316** file hashes in `offline-copy.json` match the current tree, including
every tracked/untracked source, test, script, public asset and workflow file in
those directories. The worker's recorded temporary directory
`/private/tmp/nuave-f03-offline-dw4b45te` is no longer present; its former on-disk
contents cannot be independently rechecked. A fresh verification copy was
therefore assembled from the current matching files at:

`/private/tmp/nuave-f03-review-h5hr6uc6/product`

It uses a local filesystem clone of already installed dependencies, with no
installation/download, credentials, private evidence, archive or retained
diagnostic bundles. Checks use a clean environment with dummy/blank provider
settings and telemetry disabled. Canonical verification creates its temporary
build environment only inside that copy. No lint configuration or gate was
altered and no product files were omitted.

The initial independent fast-gate attempt passed its static checks but failed
three existing tests because the sandbox denied loopback listening (`EPERM` on
`127.0.0.1`). The unchanged command subsequently passed with local-server
permission. Both logs are retained separately. This review does **not** claim
that `validate:fast` passes in the obstructed shared-tree directory.

Independently recomputed the worker's 298-entry preservation inventory: **288
unchanged**, exactly the ten reported existing source/test files changed, none
missing. All four protected-note hashes match and the notes remain untracked
and unstaged. The earlier `audit.module.css` and `openai.test.ts` edits match
their pre-correction hashes. Branch, HEAD, local upstream
`194f0f44e7f6c7f8bc3270b97a2ac9f887b830e4` and empty index are preserved.

Reviewer logs, manifest checks and fictional assertion source/results are under
`/private/tmp/nuave-f03-review-h5hr6uc6/`: `focused.log`,
`validate-fast.log` (sandbox failure), `validate-fast-local.log`, `verify.log`,
`selector-regressions.cjs`, `selector-regressions.log`,
`worker-evidence-check.json` and `preservation-before.json`.
Final checks and their hashes are recorded in `preservation-after.json` and
`review-artifact-hashes.json`. All 316 copied files still match after verification,
and its temporary `.env.production.local` was removed by the verifier's normal
restoration. Existing monitored public repository files remain unchanged by this
review.

## Limitations and verdict

**REVISE.** Correct the two bounded selector exclusions and rerun their
regressions and the required offline gates before returning for re-review.
Passing existing suites does not resolve the independently reproduced failures.
No implementation fix was made in this review.

No live website fetch, provider call, diagnostic rerun, founder walkthrough,
desktop/mobile visual judgment, private-payload inspection or new PDF inspection
was performed. Mocked extraction proves request delivery and application
behavior, not provider receipt or factual accuracy. Hosted search remains
active, and the original F-03 failure's cause remains unresolved.

**F-01 remains closed. F-03/AC-07 remain open. Spec 011 remains Approved, not
Verified.** Even a later offline PASS cannot replace the separately authorized
founder walkthrough and judgment. No staging, commit, push, publication or
deployment occurred. The only repository file added by this review is this
document; the next smallest useful action is the two selector corrections.
