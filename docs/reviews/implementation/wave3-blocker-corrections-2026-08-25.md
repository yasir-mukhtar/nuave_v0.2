# Wave 3 Blocker Corrections

Date: 2026-08-25

This report records the narrow corrective implementation that follows the Wave 3 independent verification verdict. It documents closure evidence only; it does not rerun or rewrite the Wave 3 review itself.

## 1. Frozen blocked head

`2a6d847a6ffbb7fd628e3620c1e34b4852c0e6d4`

## 2. Corrective code head

`99a3bb3cdf9095671d551c458494206be7585f18`

Normal PR CI #470 / run `32833069135` completed successfully on this exact corrective code head.

## 3. W3-A1 / N-P2-02 — Google Maps intake bypass

### Root cause

Maps rejection recognized only a limited set of Google host families and path shapes. Valid Google Maps URLs on regional Google domains or `maps.google.*` hosts could therefore fall through to the ordinary website intake path.

### Correction

The canonical source boundary now recognizes Google-owned regional host shapes deterministically. Regional `maps.google.*` hosts and regional `google.*` `/maps` forms fail closed, while ordinary website paths remain allowed.

Permanent regressions include rejection of:

- `https://maps.google.com/?q=...`
- `https://maps.google.co.uk/?q=...`
- `https://www.google.co.uk/maps/...`
- `https://google.co.id/maps/...`

The same coverage proves continued acceptance of ordinary website forms such as:

- `https://example.com/maps`
- `https://maps.example.com/`
- `https://google.com/about`

**Status: RESOLVED**

## 4. W3-A2 / N-P2-05 — generated language guard

### Root cause

The whole-pack generated-suggestion guard required at least eight clearly-English questions before classifying the model-authored default as clearly non-Indonesian. A materially non-Indonesian default with six or seven independently clearly-English questions could therefore pass that guard while still being labeled `id-ID`.

### Correction

The deterministic default-generation language guard now rejects a majority — **6/10 or greater** — of independently clearly-English questions.

Permanent coverage includes:

- 10/10 clearly-English rejection;
- 7/10 clearly-English rejection;
- 6/10 clearly-English rejection;
- 5/10 boundary behavior;
- a valid Indonesian pack;
- independence from the separate 5/5 branded/unbranded composition rule; and
- live-builder stub/fallback behavior proving unsafe model-authored output falls back without any network/provider call.

This rule applies to the **model-authored default suggestion**. Customer-edited final packs are not newly forced to preserve this generated-language default rule; their final approval/run behavior remains governed by the existing final locked-pack contract.

**Status: RESOLVED**

## 5. W3-A3 / N-P2-06 — final compact competitor leakage

### Root cause

Generated suggestions had compact comparison-identity protection, but the final edited-pack validator used weaker spaced-normalized matching. A compact rendering such as `KopiPesaing` could therefore evade final validation outside the designated comparison slot.

### Correction

Generated and final validation now share the same deterministic comparison-business identity matcher.

Covered comparison-identity variants include:

- `Kopi Pesaing`
- `Kopi-Pesaing`
- `Kopi.Pesaing`
- `Kopi_Pesaing`
- `KopiPesaing`

The final edited-pack/run boundary rejects comparison-business identity outside its designated comparison slot.

Permanent offline `/api/audit/run` regression evidence proves:

- a violating edited pack is submitted to the real route boundary;
- the route returns an HTTP validation rejection (`422`); and
- rejection occurs before credential assertion or provider execution.

**Status: RESOLVED**

## 6. W3-B1 / N-P2-17 — verify-offline write lifecycle

### Root cause

The temporary `.env.production.local` write occurred before the verifier wrapper entered the `try/finally` cleanup guarantee. A write failure after a partial mutation could therefore leave the production env file damaged or present when it had originally been absent.

### Correction

Temporary installation/write now occurs inside the unconditional snapshot-restoration lifecycle. The same cleanup boundary restores the original file state regardless of whether the temporary write completes or throws.

Permanent tests now include:

- a pre-existing production env file is restored exactly;
- an originally absent production env file is removed after the temporary lifecycle;
- partial mutation followed by write failure restores the original pre-existing file exactly;
- partial mutation followed by write failure from an initially absent state leaves no file; and
- provider-sensitive verifier environment values remain forced to offline-safe values.

**Status: RESOLVED**

## 7. W3-B2 / N-P2-14 — accessibility residual

Wave 3 classified the remaining accessibility issue as P3.

### Correction

`aria-controls` is exposed only while the corresponding mobile-menu target exists.

Runtime Playwright coverage proves:

- the closed menu target is absent;
- the closed hamburger has no dangling `aria-controls` reference;
- the open relationship points to the existing menu target;
- Escape closes the menu; and
- focus returns to the hamburger after dismissal.

**Status: RESOLVED**

## 8. Targeted corrective test evidence

Permanent suites added or expanded by this corrective pass include:

- `src/lib/audit/wave3-blocker-regressions.test.ts`
- `src/lib/audit/source-input.test.ts`
- `src/lib/audit/question-suggestion-wave2.test.ts`
- `src/lib/audit/questions-id.test.ts` as applicable to the shared final validator contract
- `src/lib/audit/wave2-route-contract.test.ts`
- `tests/verify-offline.test.mjs`
- `tests/e2e/offline-network.spec.ts`
- `src/lib/public-truth-wave2.test.ts`

Normal CI #470 recorded these relevant unit-suite results:

- `wave3-blocker-regressions`: **8/8 PASS**
- `verify-offline`: **5/5 PASS**
- `source-input`: **40/40 PASS**
- `question-suggestion-wave2`: **9/9 PASS**
- `questions-id`: **40/40 PASS**
- `wave2-route-contract`: **2/2 PASS**

The corrective regressions are included in the complete successful unit and browser gates below. No separate aggregate “targeted total” is invented beyond the recorded suite totals.

## 9. Corrective code-head verification

Normal PR CI #470 / run `32833069135` executed the repository's normal PR gate on exact corrective code head `99a3bb3cdf9095671d551c458494206be7585f18`.

| Gate | Result |
| --- | --- |
| `npm run check` | PASS |
| `npm run test:unit` | PASS — 57 files, 624/624 |
| `npm run build` | PASS |
| `npm run build:cf` | PASS |
| default E2E | PASS — 43/43 |
| forced-failure E2E | PASS — 3/3 |
| preview-disabled E2E | PASS — 2/2 |
| browser total | PASS — 48/48 |
| deployment | SKIPPED |

`Verify main came from merged PR` was also correctly **SKIPPED** because this was a pull-request run.

### `npm run verify`

**NOT separately executed in this external orchestration harness.**

- No executable private-repository checkout was available to the orchestration harness.
- No temporary CI workflow was introduced solely to invoke the wrapper.
- Every command orchestrated by the wrapper — `check`, `test:unit`, `build`, `build:cf`, and `test:e2e` — passed normal PR CI #470.
- The verifier lifecycle itself now has **5/5** permanent unit coverage in `tests/verify-offline.test.mjs`.

Literal `npm run verify` execution is therefore not claimed as PASS.

`npm run test:live-provider` was deliberately not executed.

## 10. Wave 1 regression status

**PASS**

The final 624-test unit suite retains the accepted Wave 1 coverage for:

- canonical prompt identity/order;
- category ownership;
- branded derivation;
- exact observation binding;
- protected attempt proof;
- model provenance;
- actual `web_search_call` proof;
- report proof;
- variance proof;
- cancellation;
- workflow operation generation;
- transactional resume; and
- NDJSON transaction/prefix behavior.

No new architectural guarantee is claimed beyond the accepted Wave 1 scope.

## 11. Corrective code-pass files

The diff from frozen blocked head `2a6d847a6ffbb7fd628e3620c1e34b4852c0e6d4` to corrective code head `99a3bb3cdf9095671d551c458494206be7585f18` contains these 13 implementation/test files:

- `scripts/verify-offline-helpers.mjs`
- `scripts/verify-offline.mjs`
- `src/components/LandingNav.tsx`
- `src/lib/audit/question-suggestion-guards.ts`
- `src/lib/audit/question-suggestion-wave2.test.ts`
- `src/lib/audit/questions-id.ts`
- `src/lib/audit/source-input.test.ts`
- `src/lib/audit/source-input.ts`
- `src/lib/audit/wave2-route-contract.test.ts`
- `src/lib/audit/wave3-blocker-regressions.test.ts`
- `src/lib/public-truth-wave2.test.ts`
- `tests/e2e/offline-network.spec.ts`
- `tests/verify-offline.test.mjs`

## 12. Safety accounting

- Live provider calls: **0**
- Paid provider calls: **0**
- Deployments: **0**
- Merges to `main`: **0**
- `test:live-provider` runs: **0**

The corrective code head is certified by normal PR CI and is ready to be documented for a targeted Wave 3 re-review. The targeted re-review itself is outside this corrective implementation pass.

## Targeted re-review supersession note — 2026-08-25

The first targeted re-review at frozen head `cbe3913b669c020f57b97e830301ff1788d97f63` subsequently reopened W3-A1 and W3-A3. That targeted review remains historical independent evidence and has not been rewritten.

The subsequent narrow implementation and closure evidence are recorded in:

`docs/reviews/implementation/wave3-targeted-rereview-corrections-2026-08-25.md`
