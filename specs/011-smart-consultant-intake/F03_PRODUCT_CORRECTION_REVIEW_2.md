# F-03 product correction — independent re-review

Date: 2026-09-23. Branch: `devin/sol-smart-consultant-intake-plan`.
HEAD: `2a21f856d33264887df6287f9b6d9dd22468fea5`.
Scope: the two selector corrections recorded in the
[implementation result](./F03_PRODUCT_CORRECTION_IMPLEMENTATION_RESULT.md),
under the unchanged [approved scope](./F03_PRODUCT_CORRECTION_SCOPE.md).
The [original review](./F03_PRODUCT_CORRECTION_REVIEW.md) remains unchanged.

## Findings

No additional actionable finding was identified in the revision. Both original
P2 findings are corrected in the inspected code and pass the original seven
reviewer assertions against a freshly built selector:

1. **Zero-opacity exclusion — resolved.**
   [source-excerpt.ts](../../src/lib/audit/source-excerpt.ts), lines 119–122 and
   208–221, now matches the complete
   `opacity` declaration, including decimal zero and `!important`, and retains
   inherited exclusion for descendants. Tests at
   [source-excerpt.test.ts](../../src/lib/audit/source-excerpt.test.ts), lines
   41–71, cover zero forms, hidden-only
   outcomes, nonzero controls and unrelated properties such as `stroke-opacity`
   and `--opacity`. The three original failing transparent-paragraph assertions
   now pass without changing their expected outputs.
2. **Customer-review exclusion — resolved.**
   `src/lib/audit/source-excerpt.ts`, lines 117–118 and 207–217, adds the bounded
   `review`/`reviews` tokens to the existing container-label matcher. Tests at
   `src/lib/audit/source-excerpt.test.ts:72–91` independently cover class,
   ID and accessible-label identification, reviews-only pages, and an ordinary
   business-description/`preview` control. The original customer-review assertion
   now passes, as do the existing testimonial and visible-text controls.

The amended integration case in
[smart-source-preparation.test.tsx](../../src/lib/intake/smart-source-preparation.test.tsx),
lines 379–426, checks both excluded-only
page types through the real Smart UI, route, selector and mocked provider/SDK
path. It requires no supplemental source-data object, the exact approved notice,
`no-usable-text` restoration, one extraction and no replay on Back/reload. It
preserves returned proposals rather than adding an excerpt-matching gate.

No implementation change is requested by this re-review. Final gate results
and verdict follow below.

## Independent checks

| Check | Re-review result |
|---|---|
| Original seven standalone reviewer assertions | **PASS — 7/7**, unchanged assertion source against the current selector. |
| Nine focused regression suites | **PASS — 233 tests**, including all 86 tests in the two affected suites. |
| `npm run validate:fast` | **PASS — 1,232 tests in 90 suites**, plus type, lint, format and typography checks; 23 lint warnings, zero errors. |
| `npm run verify` | **PASS — exit 0:** 1,232 tests in 90 suites, Next production build, Cloudflare production bundle, 28 enabled plus three disabled browser checks, and `Offline verification passed.` |
| Diff whitespace and index | `git diff --check` passes; index is empty. |

The focused suite selection is the same as the original review: `source-excerpt`,
`safe-source-fetch`, `source-identity`, `local-preparation-routes`, `website-input`,
`openai`, `smart-source-preparation`, `smart-journey` and `smart-intake-contract`.

Comparison with the original review's own manifest independently confirms that
only the selector and its two test files changed among the 316 product files.
The extraction route/provider request, hosted search and model settings, network
and privacy controls outside these exclusions, accounting/retry implementation,
status storage, proposal origins and downstream contracts are byte-for-byte
unchanged from the reviewed implementation. The broad gates repeat the existing
historical-hold, report and export regressions; this revision does not reopen
their product contracts.

## Evidence and preservation

Inspected the worker's complete seven-file revision diff and red/green, focused,
assertion and broad-gate logs under
`/private/tmp/nuave-f03-selector-revision-zv5n7vte/`. All **14** recorded artifact
hashes match. Those logs report 15 initial failures/71 passes, then 86 tests
passing in the affected suites, 233 focused tests and 1,232 broad tests plus
both builds and 31 browser checks. These remain **worker results**, distinct
from the independent executions above; the pre-fix revision suites were not
rerun in this re-review.

Recomputed the worker's 483-file preservation inventory: **476 unchanged** and
exactly the seven reported differences—three source/test files and four records
(`docs/NOW.md`, implementation result, acceptance evidence and verification).
All post-revision hashes match the current tree. All **316** verification-copy
hashes match both the working tree and the retained worker copy, with no omitted
tracked/untracked product files in `src`, `tests`, `scripts`, `public` or
`.github`.

The original review's SHA-256 remains
`b12e08e5d5f450833c73580546ad52eeb93f2675db1d64de5c01e2ed09ef2257`.
The four protected-note hashes and earlier print-CSS/extraction-test hashes also
match. Protected notes remain untracked and unstaged. Branch, HEAD, upstream
`194f0f44e7f6c7f8bc3270b97a2ac9f887b830e4` and the empty index are preserved.
The spec, approved scope and governing instructions match the original review's
hashes; their authority and limitations have not changed.

Independent execution uses a fresh matching copy at
`/private/tmp/nuave-f03-rereview-s0on5too/product`, with a local clone of installed
dependencies and clean dummy/blank provider settings. No dependency download,
credential/private-evidence copy, retained diagnostic execution or lint-policy
change is part of this review. The known shared-tree lint obstruction remains;
this review makes no claim that the shared-tree gate passes. Local-server
permission is used for the existing loopback tests and browser checks.

Reviewer logs and hash checks are retained under
`/private/tmp/nuave-f03-rereview-s0on5too/`: `reviewer-assertions.log`,
`focused.log`, `validate-fast.log`, `verify.log`, `worker-evidence-check.json`,
`prior-review-comparison.json`, `offline-copy.json`, `preservation-before.json`,
`preservation-after.json` and `artifact-hashes.json`. After the gates, all 316
product hashes still match and the verifier has removed its temporary build
environment through normal restoration. The original review, worker evidence
and existing repository changes are preserved; only this re-review document is
added to the repository.

## Limitations and verdict

**PASS for the revised bounded offline product correction.** Both original P2
review findings are closed. This supersedes the original offline REVISE verdict
for the inspected revision only; it does not replace the founder's live product
judgment. No further code correction is requested by this review.

This remains static HTML selection with conservative privacy screening, not
browser rendering or perfect content classification. Mocked extraction proves
request delivery and application behavior, not provider receipt, factual
accuracy or live prepared-summary quality. No live fetch/provider call,
diagnostic rerun, private-payload inspection, founder walkthrough, new PDF
inspection, staging, commit, push, publication or deployment occurred.

**F-01 remains closed. F-03/AC-07 remain open. Spec 011 remains Approved, not
Verified.** An offline PASS cannot replace the separately authorized founder
walkthrough and judgment. The historical F-03 cause remains unresolved.

The next smallest useful action is to prepare the founder walkthrough with an
honest source/required-meaning plan, then obtain separate live authorization.
Use one tab for desktop/mobile and stop before final confirmation/question
generation unless that work is separately authorized. This re-review adds only
`F03_PRODUCT_CORRECTION_REVIEW_2.md` and grants no live-call or publication
permission.
