# Wave 3 Targeted Re-Review Corrections

Date: 2026-08-25

## Targeted blocked head

`cbe3913b669c020f57b97e830301ff1788d97f63`

The targeted re-review at `79e82422b696f45c801879e01d6ec60ca2a5850c` reopened only W3-A1 / N-P2-02 and W3-A3 / N-P2-06. This implementation pass is limited to those two findings.

Corrective code head after the narrow implementation and formatting-only follow-up:

`69d8c9c4711560824ecca6249cbae071b77cfe57`

Normal PR CI #473 / run `32847329209` completed successfully on that exact corrective code head.

## A1 correction

### Root cause

The first Wave 3 correction normalized an optional leading `www` for regional `google.*` hosts, but `isMapsGoogleHost()` inspected the raw hostname labels. As a result, `www.maps.google.*` began with `www` instead of `maps` and could fall through to ordinary website intake.

### Fix

`src/lib/audit/source-input.ts` now uses one small hostname-label helper that removes only an optional leading `www` before either Google host classifier inspects the canonical labels.

The resulting host-shape policy recognizes both forms consistently:

- `maps.google.com` / `www.maps.google.com`
- `maps.google.co.id` / `www.maps.google.co.id`
- `maps.google.co.uk` / `www.maps.google.co.uk`
- equivalent supported regional Google shapes

The logic remains label-based. It does not use a broad `google` or `maps` substring rule.

### Regression evidence

`src/lib/audit/source-input.test.ts` now permanently rejects:

- `https://www.maps.google.com/?q=Kopi`
- `https://www.maps.google.co.id/?q=Kopi`
- `https://www.maps.google.co.uk/?q=Kopi`
- the existing non-`www` `maps.google.*` forms
- the existing regional `google.* /maps` forms and shortcuts

Negative controls remain accepted:

- `https://example.com/maps`
- `https://maps.example.com/`
- `https://www.maps.example.com/`
- `https://www.google.com/about`
- `https://google.co.uk/about`

Existing Instagram profile/content-path regressions remain in the same suite.

Code-head CI #473: `source-input` **45/45 PASS**.

## A3 correction

### Root cause

The shared comparison-identity matcher applied the minimum compact-identity length before checking the safe exact normalized whole-token form. The minimum was intended only to prevent false positives from tiny compact-substring matching, but this ordering also disabled exact short identities such as `XO`.

### Fix

`src/lib/audit/questions-id.ts` now evaluates comparison identity in this order:

1. normalize identity and reject only an empty identity;
2. normalize question text;
3. always test the exact normalized whole-token identity;
4. if exact matching fails, enforce the minimum compact length;
5. only then perform compact/punctuation-insensitive substring matching.

`validateIndonesianQuestionPack()` continues to use this shared matcher, so generated suggestions and the final customer-edited pack retain the same comparison-identity semantics.

### Short-name exact-match behavior

For comparison business `XO`, permanent regressions prove exact token matching is case-insensitive and detects:

- `seperti XO di Depok`
- `bandingkan dengan XO`
- `xo cocok tidak?`

A final pack containing exact `XO` outside the designated comparison slot produces `competitor_leakage`.

The designated slot remains valid with `XO`.

### Long-name compact behavior

The existing long-name matrix remains green for `Kopi Pesaing` outside slot 6:

- `Kopi Pesaing`
- `Kopi-Pesaing`
- `Kopi.Pesaing`
- `Kopi_Pesaing`
- `KopiPesaing`

The designated comparison slot remains allowed.

### Negative false-positive controls

Short compact-substring matching remains disabled. For identity `XO`, these longer unrelated tokens do not match solely because they contain the letters `xo`:

- `taxonomi`
- `exotic`
- `pixelbox`

The correction therefore restores exact short-name safety without removing the compact false-positive guardrail.

### Route preflight evidence

`src/lib/audit/wave2-route-contract.test.ts` now includes an offline final-boundary regression with comparison business `XO` and a non-comparison slot edited to contain exact token `XO`.

The real `/api/audit/run` handler returns **HTTP 422** before protected execution. The regression explicitly proves:

- credential assertion mock: **0 calls**
- provider execution mock: **0 calls**

The existing `KopiPesaing` route-preflight regression remains intact.

Code-head CI #473:

- `wave3-blocker-regressions`: **15/15 PASS**
- `wave2-route-contract`: **3/3 PASS**
- `questions-id`: **40/40 PASS**

## Previously closed findings

- **W3-A2 / N-P2-05 — unchanged / CLOSED.** No language-guard implementation or test was modified. The 6/10 generated-default majority threshold remains intact; `question-suggestion-wave2` is 9/9 PASS in CI #473.
- **W3-B1 / N-P2-17 — unchanged / CLOSED.** No verifier implementation or test was modified; `verify-offline` is 5/5 PASS in CI #473.
- **W3-B2 / N-P2-14 — unchanged / CLOSED.** No mobile-navigation implementation or browser regression was modified; the runtime mobile-nav test remains green in the 43/43 default browser suite.

## Verification

### Targeted evidence

The requested named suites are represented in the normal full unit run on exact corrective code head `69d8c9c4711560824ecca6249cbae071b77cfe57`:

| Suite | Result |
| --- | --- |
| `source-input` | 45/45 PASS |
| `website-input` | 19/19 PASS |
| `questions-id` | 40/40 PASS |
| `wave3-blocker-regressions` | 15/15 PASS |
| `wave2-route-contract` | 3/3 PASS |
| Named targeted total | **122/122 PASS** |

Specific closure proofs:

- A1: `www.maps.google.com` and the required regional `www.maps.google.*` cases are rejected.
- A3: exact short `XO` outside slot 6 is rejected.
- A3 negative control: `taxonomi`, `exotic`, and `pixelbox` do not match merely because they contain `xo` inside a longer token.
- A3 route: violating final pack returns `422` before credential assertion/provider execution.

### Full offline PR gate on corrective code head

Normal PR CI #473 / run `32847329209`:

| Gate | Result |
| --- | --- |
| `npm run check` | PASS — typecheck PASS; lint 0 errors / 22 existing warnings; Prettier PASS |
| `npm run test:unit` | PASS — 57 files, **637/637** |
| `npm run build` | PASS |
| `npm run build:cf` | PASS |
| default E2E | PASS — **43/43** |
| forced-failure E2E | PASS — **3/3** |
| preview-disabled E2E | PASS — **2/2** |
| browser total | PASS — **48/48** |
| Verify main came from merged PR | SKIPPED |
| deployment | SKIPPED |

`npm run verify` was **not separately executed** in this external orchestration harness. No temporary CI workflow was introduced merely to invoke it. Every command it orchestrates passed the normal PR gate above.

`npm run test:live-provider` was deliberately **not** executed.

### Wave 1 regression status

**PASS.** The full 637-test unit run retains the protected Wave 1 locked-question, observation-method, report/variance, cancellation, workflow-generation, resume, and stream-transaction coverage. No Wave 1 production boundary was changed by this narrow correction.

## Safety

- live provider calls: **0**
- paid provider calls: **0**
- `test:live-provider` runs: **0**
- deployments: **0**
- merges to `main`: **0**

PR #18 remains draft and unmerged. This note records implementation and verification evidence only; it does not perform the final targeted re-review.
