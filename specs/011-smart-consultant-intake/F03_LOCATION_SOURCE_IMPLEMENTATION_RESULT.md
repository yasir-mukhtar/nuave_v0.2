# F-03 location-source implementation result

2026-09-24. **Bounded implementation complete; worker offline checks PASS.
Independent review pending. Current-main integration remains unresolved.**

Implemented the [approved handoff](./F03_LOCATION_SOURCE_IMPLEMENTATION_PROMPT.md)
on its explicitly named preserved checkout. No live source/provider call,
live Periksa or confirmation, staging, commit, push or publication occurred.
This is not a claim that the branch is ready for a PR against current main.

## Task delta

Only extraction instruction text changes at runtime:

- OpenAI and testing-only Gemini receive the same location-discovery and
  geographic-meaning instructions: homepage evidence first, then relevant
  official location/service-area evidence within existing search; at most one
  selected canonical-host page, actual evidence URLs, and unresolved ambiguity.
- Reach follows approved broad presence. Supported domestic national networks
  use `seluruh`; current Indonesia-and-abroad presence uses `luar`; both have no
  active city list. Location presence cannot manufacture universal delivery or
  turn online ordering into online service use. Contact, aspiration, unexplained
  count and foreign-sounding names cannot establish broader reach.
- Regional descriptions use faithful published areas or broader descriptions.
  The accepted unrepresentable regional case retains supported reach with empty
  areas; no arbitrary eight-city subset, invented grouping or focus change.
- The existing output-limit retry preserves up to eight supported market areas
  instead of shortening them to four. Eligibility, attempts, source reuse and
  reservation ordering are unchanged. Valid partial output never adds a retry.

Schemas, UI/mapping, fetcher/selector, source disclosure, privacy/rate controls,
model/tool settings, provider roles, other model messages, ledger, direct-ten
writer, report/export contracts and historical hold remain unchanged. A literal
comparison restores the complete pre-task runtime files by replacing only the
approved instruction blocks and the OpenAI retry string; see
`runtime-delta-check.json` in the evidence directory.

## Files changed

Runtime:

- `src/lib/audit/openai.ts`
- `src/lib/audit/gemini.ts`

Regressions:

- `src/lib/audit/openai.test.ts`: actual initial/retry requests, adapter parity,
  existing settings, and six regional areas surviving an eligible retry.
- `src/lib/intake/smart-source-preparation.test.tsx`: seven fictional geography
  outcomes through the real UI/routes/fetcher/SDK with intercepted transports;
  exact proposals/origins, optional absence, source links, reload, request counts
  and the existing confirmation gate.
- `src/lib/intake/smart-intake-contract.test.ts`: national/international meaning
  through confirmation, writer, report context and customer export; unresolved
  regional confirmation and owner correction.

Records: this result, `ACCEPTANCE_EVIDENCE.md`, `VERIFICATION.md`, `docs/NOW.md`.
Existing edits and prior evidence are preserved; the delta is measured against
the starting working tree, not HEAD alone.

## Actual verification

All results below are this worker's executions, not independent review.

| Check | Result |
|---|---|
| Before runtime fix, three affected suites | 2 intended failures, 74 passes: missing discovery rules and missing retry-area exception. |
| Final focused regressions | PASS: 259 tests across 11 suites. |
| `npm run validate:fast` | PASS: 1,244 tests across 90 suites; type, lint, format and typography checks. |
| `npm run verify` | PASS, exit 0: 1,244 tests, Next and Cloudflare/OpenNext builds, 28 enabled and 3 disabled browser checks; `Offline verification passed.` |
| Lint | Zero errors; 23 existing warnings. Two introduced test-signature warnings were removed before the final gates. |
| Preservation / whitespace | Matching 316-file product copy; protected notes, index and task delta checked; `git diff --check` passed. |

The focused suites are `source-excerpt`, `safe-source-fetch`, `source-identity`,
`local-preparation-routes`, `website-input`, `openai`, `gemini`,
`smart-source-preparation`, `smart-journey`, `smart-intake-contract` and
`customer-evidence-export`. Existing regressions cover source/rate/privacy
failure, prior cost/carryover, failed attempts, reservation before dispatch,
excerpt reuse, Back/reload, duplicate actions and historical preservation.

Execution used Darwin arm64, Node 22.23.2, npm 10.9.8 and cloned installed
dependencies, with no dependency download. The isolated product is
`/private/tmp/nuave-f03-location-j1557mch/product/`; all 316 public product/config
files match the final shared product. No credentials, private evidence or archive
were copied. Gates ran with a clean environment, dummy OpenAI/OpenCode values
and blank other provider credentials. The verifier restored its temporary
production environment file. Shared-tree lint remains obstructed by ignored
evidence; its policy and evidence were not changed, and no shared-tree gate PASS
is claimed.

The first broad attempt failed three loopback-listener tests under sandbox
`EPERM` plus one credential assertion because an unnecessary dummy Cheaper
Inference key was present. The rerun used permitted local servers and the
canonical dummy/blank provider environment. Both broad gates were repeated
after the test-only warning cleanup. These attempts remain in the logs.

## Base check and preservation

Branch `devin/sol-smart-consultant-intake-plan`, HEAD
`2a21f856d33264887df6287f9b6d9dd22468fea5`, local upstream `194f0f4` and empty
index match the handoff and remain unchanged. The four protected-note hashes
match the handoff table; the notes remain untracked and unstaged. The initial
inventory covers 585 nonignored files outside excluded private/archive paths.
The final comparison permits only the five code/test files, three status records
and this new result. Print CSS, earlier selector fixes and existing regressions
are retained.

A read-only remote check found current main at
`4470deb2553ae1413b039191a192828c93c7fcca`, beyond local `origin/main` `d679a51`.
The remote was fetched only into an isolated no-checkout clone. A three-way
integration probe against common ancestor `4e6b2cf` found conflicts in
`src/app/audit/ReportView.tsx` and `tests/e2e/new-intake-glm.spec.ts`; upstream also
contains report components and dependency changes. No integration was applied.
The founder explicitly confirmed on 2026-09-24: "Finish on the preserved baseline
(Recommended)." This correction therefore remains on `2a21f85`; report
integration is separate work and has not been authorized. Current-main
reconciliation remains a concrete prerequisite to PR readiness; the gates here
verify the preserved baseline plus this correction, not an integrated main.

## Evidence and independent review

Evidence directory: `/private/tmp/nuave-f03-location-j1557mch/`.
`implementation.patch` is the exact five-file implementation delta, already
applied to the shared checkout. `baseline/` retains pre-task public product files;
`candidate-product-hashes.json` identifies the tested product. Preservation
inventories, `base-check.json`, `base-integration-probe.json`, the complete task
diff and `artifact-hashes.json` support comparison without reading private notes.
The subsequent documentation-only founder confirmation is recorded in
`baseline-confirmation.json`; the original verification artifacts are unchanged.

| Artifact | SHA-256 |
|---|---|
| `implementation.patch` | `baedd5395c3805ba1c918dbac57182f3452e28a193e5514f4540c5865632c62d` |
| `candidate-product-hashes.json` | `78027f56252a682631488b680151ea795fa90b0c56d6089e705bd0498b759403` |
| `red.log` | `d16b45cc0df8b209b8971458ce46c655e6364ac4e9caf3dd285c1015630d056c` |
| `focused-final.log` | `98b28ba2fb36a4d756b16da2c9bfda42a4a8205a67ac81c61071e103dcbdb8d6` |
| `validate-fast.log` | `b684f142b3ae7962c33a6791c364462d04a944db24aada3198ae58ee2c74f561` |
| `verify.log` | `ee6b8dd2de9608cf4e5155b81cc8d723974892b75474cac8d061504e2b573d58` |

Independent review should compare the approved package and current task delta,
verify preservation/settings/request ordering, and rerun the focused and offline
gates in a fresh matching product copy. Assess current-main integration
separately; do not resolve it by overwriting either report implementation.
No reviewer was dispatched by this worker.

Mocked responses and instruction assertions do not prove hosted discovery or
correct live geographic interpretation. Hosted tool/page limits remain advisory.
The unchanged context stores broad reach and channel enums separately; it does
not encode a separate geographic boundary for each channel. The deterministic
writer/export checks add no universal-delivery claim, but do not prove what a
later model will infer. No downstream runtime conflict was established on the
preserved baseline; keep live interpretation in the later acceptance review.
The regional eight-area limitation and unsupported optional fields remain.

Next: independent review of this bounded correction, followed only after its
PASS by separately authorized live preparation. Resolve the base conflicts
before PR readiness. Accounting remains USD 1.04786450 of 5, including historical
carryover. F-01 remains closed; F-03/AC-07 remain open; Spec 011 remains Approved,
not Verified.
