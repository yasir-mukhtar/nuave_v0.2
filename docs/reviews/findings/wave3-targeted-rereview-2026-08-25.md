# Wave 3 Targeted Re-Review

Date: 2026-08-25

## Frozen target

Repository: `yasir-mukhtar/nuave_v0.2`

PR #18 was frozen and rechecked before report publication as:

- OPEN
- DRAFT
- UNMERGED
- base: `main`
- frozen base SHA: `0ee72cf1d867bebbe755b91350262fc6499876ae`
- branch: `fix/wave2-subsystem-consumers-2026-08-23`
- final reviewed head: `cbe3913b669c020f57b97e830301ff1788d97f63`

The PR head did not move during this targeted re-review.

Corrective code head: `99a3bb3cdf9095671d551c458494206be7585f18`.

Pre-correction blocked head: `2a6d847a6ffbb7fd628e3620c1e34b4852c0e6d4`.

## Reviewed corrective range

Primary implementation/test review range:

`2a6d847a6ffbb7fd628e3620c1e34b4852c0e6d4..99a3bb3cdf9095671d551c458494206be7585f18`

This range is 17 commits ahead of the blocked head and changes the 13 expected implementation/test files only:

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

Post-code range:

`99a3bb3cdf9095671d551c458494206be7585f18..cbe3913b669c020f57b97e830301ff1788d97f63`

This is exactly one later commit and is documentation-only. It touches only:

- `docs/reviews/implementation/wave2-subsystem-consumers-2026-08-23.md`
- `docs/reviews/implementation/wave3-blocker-corrections-2026-08-25.md`

The original Wave 3 contract-validator, browser/release-validator, and final-verdict reports were read before assessing closure. This pass did not restart the broader Wave 3 audit.

## W3-A1

**REOPENED**

The correction closes the specifically recorded `maps.google.*`, regional `google.* /maps`, `maps.app.goo.gl`, and `g.page` cases and preserves the negative controls such as `example.com/maps`, `maps.example.com`, and `google.com/about`.

However, the new host matcher still has an optional-`www` subdomain gap for the `maps.google.*` family.

Current logic behaves as follows for:

`https://www.maps.google.com/?q=Kopi`

- `parsePublicHttpUrl()` accepts the hostname as a plausible public HTTP(S) URL.
- `isMapsGoogleHost("www.maps.google.com")` returns false because it requires the first label to be `maps`.
- `isRegionalGoogleHost("www.maps.google.com")` strips `www`, then sees `maps` rather than `google` as the first remaining label and returns false.
- `isGoogleBusinessOrMapsUrl()` therefore returns false.
- `parseSourceInput()` falls through to the generic website branch.

Exact reproduction under the current logic:

```text
parseSourceInput("https://www.maps.google.com/?q=Kopi")

=> {
  sourceType: "website",
  normalizedUrl: "https://www.maps.google.com/?q=Kopi"
}
```

Expected under the current product contract: `null`.

The same structural gap exists for regional variants such as `www.maps.google.co.uk`.

The permanent source-input regression set does not cover the optional-`www` form on a `maps.google.*` hostname.

Therefore unsupported Google Maps input can still realistically become `sourceType: "website"` through the canonical parser. The original P2 root is not fully closed.

## W3-A2

**CLOSED**

The generated-default language guard now adopts the requested deterministic majority threshold: six or more independently clearly-English questions in the ten-question model-authored default produce `clearly_non_indonesian_output`.

Permanent coverage proves:

- 10/10 clearly-English: rejected;
- 7/10: rejected;
- 6/10: rejected;
- 5/10: does not trigger the majority rule;
- a valid Indonesian pack passes;
- the 5/5 branded/unbranded default-composition rule remains a separate constraint.

`buildLiveIndonesianPromptPack()` applies `generatedSuggestionGuardIssues()` to the model-authored default before returning it. A bad majority-English provider result is replaced by the deterministic fallback and is not returned as successful `id-ID` model output.

The rule remains generation-only. The final customer-edited pack is not incorrectly forced through this default-generation language heuristic; it remains governed by final locked-pack validation and blockers.

No semantic language detector beyond the adopted deterministic contract was required for this verdict.

## W3-A3

**REOPENED**

For ordinary comparison-business identities, the main correction works:

- generated suggestions and final edited-pack validation call the same `containsIndonesianComparisonIdentity()` helper;
- `Kopi Pesaing`, `Kopi-Pesaing`, `Kopi.Pesaing`, `Kopi_Pesaing`, and `KopiPesaing` are detected outside slot 6;
- case and punctuation are normalized;
- compact rendering and punctuation-to-space rendering are handled;
- surrounding words do not prevent detection;
- the designated comparison slot remains valid;
- `/api/audit/run` performs final locked-pack validation before credential assertion and provider execution;
- the real offline route regression proves a violating `KopiPesaing` edited pack returns `422` before credential or provider calls.

However, the new shared matcher introduces a short-name regression at the final boundary.

`containsNormalizedIdentity()` currently performs this guard before its exact whole-token check:

```text
if (compactIdentity.length < minimumCompactLength) return false;
```

`containsIndonesianComparisonIdentity()` passes a minimum compact length of `3`.

The request schema permits `verified_competitor.name` to be any trimmed string up to 160 characters; it has no minimum length. `minimizeIndonesianBrief()` accepts any non-empty comparison name when a comparison source URL is present.

Exact reproduction:

```text
comparison_business.name = "XO"
comparison_business.source_url = "https://xo.example"

slot 1 = "Ada rekomendasi kedai kopi seperti XO di Depok?"
```

For this input, the current shared matcher returns false because normalized compact identity `xo` has length 2. Consequently the final validator does not emit `competitor_leakage` for the exact whole-token identity outside slot 6.

This is not merely a pre-existing limitation of final validation. Before the corrective range, the final validator performed normalized whole-token matching without the new minimum-length early return, so the exact short identity `XO` was detected. The corrective unification therefore directly regresses final validation for valid short comparison names.

The false-positive guardrail is too coarse: it suppresses exact whole-token matching for short identities instead of limiting only unsafe compact-substring matching.

Thus the named long-form Wave 3 reproduction is closed, but final comparison-identity safety is still bypassable for a valid short comparison name. W3-A3 remains a current-scope P2 blocker.

## W3-B1

**CLOSED**

The temporary `.env.production.local` mutation now occurs inside `withRestoredFileSnapshot()`, whose `finally` unconditionally restores the captured snapshot.

The reviewed lifecycle satisfies the requested cases:

- **A — existed / write succeeds / task succeeds:** exact original snapshot is restored by the inner `finally`.
- **B — existed / partial mutation then throw:** permanent fault-injection coverage restores the exact original contents.
- **C — absent / write succeeds:** restoration removes the verifier-created file.
- **D — absent / partial mutation then throw:** permanent coverage proves no file remains.
- **E — child/task failure:** a rejected `run()` unwinds through the same `withRestoredFileSnapshot()` `finally`; the outer `finally` also performs idempotent defensive restoration.
- **F — SIGINT/SIGTERM:** the signal handler terminates the active process tree and restores the snapshot immediately; subsequent unwind/outer cleanup retains the same restoration guarantee.

The original W3-B1 reproduction — the temporary env write occurring before the restoration `try/finally` — no longer exists.

This assessment does not require process-supervisor guarantees or recovery from a failure of the restoration write itself.

## W3-B2

**CLOSED**

Runtime semantics now match the disclosure relationship:

Closed state:

- mobile menu target is absent from the DOM;
- `aria-expanded="false"`;
- `aria-controls` is absent;
- hidden menu links do not exist and are therefore not focusable.

Open state:

- the menu target exists as `#nuave-mobile-menu`;
- `aria-expanded="true"`;
- `aria-controls="nuave-mobile-menu"` points to the existing target;
- focus moves to the first mobile-menu link.

Close state:

- Escape closes the menu;
- target disappears;
- `aria-expanded` returns to false;
- `aria-controls` disappears again;
- focus returns to the hamburger.

The mobile-to-desktop resize path still closes stale mobile state. Permanent Playwright coverage verifies the closed/open/Escape/focus relationship at runtime, and the earlier fix removing closed content from the DOM remains intact.

No more serious regression was reproduced; this P3 residual is closed.

## Corrective-diff regression check

The narrow touched-boundary regression check found:

- Instagram profile parsing remains accepted and Instagram content paths remain rejected.
- Ordinary website intake remains accepted, including `/maps` paths on non-Google hosts.
- The Google Maps correction remains incomplete only as reported in W3-A1.
- Wave 1 locked-question/category/branded/ID coverage remains green in the final unit suite.
- The designated comparison slot still works for the ordinary comparison-business case.
- `/api/audit/run` still performs final question validation before protected credential/provider execution.
- The A3 short-name behavior above is a new regression directly introduced by the corrective matcher unification; no second independent A3 finding is needed.
- Default generated 5/5 behavior remains intact and independent from customer-edited final composition.
- Default Vitest discovery remains offline-safe: `scripts/**` is excluded and live-provider tests require the explicit `vitest.live-provider.config.ts` / `test:live-provider` command.
- Playwright server configuration continues to allowlist inherited environment values, forces live-provider testing off, and blanks provider credentials.
- The mobile-menu original focusability/keyboard fix remains intact.

No additional new P0/P1/P2 corrective-diff regression was reproduced beyond the W3-A3 short-name regression described above.

## CI/release evidence

Final documentation-head CI was independently inspected:

- Run: **#471**
- Run ID: `32834495153`
- final PR head: `cbe3913b669c020f57b97e830301ff1788d97f63`
- result: **SUCCESS**

The pull-request runner checked GitHub's synthetic merge commit `7e47768dbe3b513c233056653974e69c3fbd1dd6`, recorded in the log as the merge of exact head `cbe3913b669c020f57b97e830301ff1788d97f63` into exact frozen base `0ee72cf1d867bebbe755b91350262fc6499876ae`.

Verified gates:

| Gate | Result |
| --- | --- |
| `npm run check` | PASS |
| unit | PASS — 57 files, 624/624 |
| `npm run build` | PASS |
| `npm run build:cf` | PASS |
| default E2E | PASS — 43/43 |
| forced-failure E2E | PASS — 3/3 |
| preview-disabled E2E | PASS — 2/2 |
| browser total | PASS — 48/48 |
| Verify main came from merged PR | SKIPPED |
| Deploy to Cloudflare Workers | SKIPPED |

The final browser suite includes the runtime mobile-nav disclosure regression and the offline network guard.

The absence of a separate literal `npm run verify` invocation is not treated as a blocker. W3-B1 was independently reviewed against the corrected verifier source and permanent fault-injection tests.

The existing lint warnings and dependency advisories were not elevated; no correction-specific current-scope failure was demonstrated from them.

CI/release evidence itself is valid. The BLOCK verdict is caused by source-level current-scope correctness defects, not by a failed CI gate or unsafe deployment execution.

## Residual limitations

K-10 remains **Future** and is not a blocker.

The generated-language guard remains intentionally deterministic/marker-based rather than semantic language detection; that is the adopted current contract and is not a residual defect here.

No live-provider test was required or performed.

## Final verdict

**BLOCK**

Reason:

1. **W3-A1 remains REOPENED (P2):** `www.maps.google.*` Maps-shaped host forms still bypass the canonical Google Maps rejection and become `sourceType: "website"`.
2. **W3-A3 remains REOPENED (P2):** the corrective shared matcher suppresses exact comparison-name matching below three compact characters, creating a new final-validation bypass for valid short names such as `XO`.

W3-A2, W3-B1, and W3-B2 are CLOSED. The ordinary long-form W3-A3 reproduction is fixed, but the same final comparison-identity safety boundary is not fully closed because of the short-name regression.

Safety accounting for this targeted re-review:

- live provider calls: **0**
- paid provider calls: **0**
- `test:live-provider` runs: **0**
- deployments: **0**
- merges to `main`: **0**
- PR #18 modifications: **0**
- production code modifications: **0**
- test/config modifications: **0**
- review-only report branch created: **1**
- review-only report files created: **1**
