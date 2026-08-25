# Wave 3 Browser / Release Validator — Independent Review

Date: 2026-08-25

## Verdict

**BLOCK**

Frozen target reviewed: `2a6d847a6ffbb7fd628e3620c1e34b4852c0e6d4`

This was a review-only pass. No application, test, config, workflow, deployment, merge, or provider behavior was modified or invoked.

## Review lane and independence mechanism

Reviewer B followed the browser/customer-path/release-isolation checklist directly from the frozen implementation and CI rather than using Reviewer A's report as review input. The available ChatGPT/GitHub harness does not expose a separately spawned subagent or a genuinely isolated model context, so literal process independence cannot be claimed. The lane was kept scope-separated and its initial inspection centered on browser/public/test/release files. The orchestrator must state this limitation in final synthesis.

## Scope challenged

The pass inspected the landing-to-report customer journey, public truth, mobile navigation, offline network isolation, Spec004, Vitest discovery, offline verifier lifecycle, and CI/deployment guards.

Key files included:

- `src/app/audit/SourceHero.tsx`
- `src/app/audit/SimilarBusinessesEditor.tsx`
- `src/app/audit/AuditWorkflow.tsx`
- `src/app/audit/AuditRunStep.tsx`
- `src/app/audit/ReportView.tsx`
- `src/components/LandingNav.tsx`
- `src/components/LandingAuditHero.tsx`
- `src/app/faq/page.tsx`
- `src/app/terms/page.tsx`
- `src/app/privacy/page.tsx`
- `src/app/support/page.tsx`
- `src/app/audit/spec004/*`
- `tests/e2e/**`
- `playwright.config*.ts`
- `tests/e2e/shared-config.ts`
- `tests/e2e/network-guard.ts`
- `vitest.config.ts`
- `vitest.live-provider.config.ts`
- `package.json`
- `scripts/verify-offline.mjs`
- `scripts/verify-offline-helpers.mjs`
- `.github/workflows/ci.yml`

The review brief also named `.github/workflows/deploy-pages.yml`; that file does not exist on the frozen target. Its absence is not a defect. The active deployment logic is in `ci.yml`.

## Accepted blocking finding

### B-1 — P2 — Offline verifier can miss restoration when the temporary env write itself throws

**Relation:** `N-P2-17` — reopened

**Exact boundary:** `scripts/verify-offline.mjs` — top-level write of `.env.production.local`

**Failure scenario**

The verifier correctly captures the original `.env.production.local` state and has a `finally` block that terminates any child process and restores the snapshot. However, the temporary build env is written with:

`writeFileSync(productionEnvPath, buildOnlyEnv, "utf8")`

**before** entering the `try { ... } catch { ... } finally { ... }` region.

If that write throws, the cleanup `finally` never runs. A failure can occur before any npm child exists. More importantly, a filesystem write can fail after a destination has been opened/truncated or partially written (for example filesystem exhaustion/I/O failure), meaning a pre-existing `.env.production.local` can be damaged without snapshot restoration.

This is precisely one of the lifecycle cases the Wave 3 checklist requires the verifier to survive: exception during env write / exception before `finally`.

**Why existing tests missed it**

`tests/verify-offline.test.mjs` tests the helper primitives independently:

- restore a pre-existing file exactly;
- remove a verifier-created file when none existed;
- force provider-sensitive environment values offline.

It does not execute or fault-inject the wrapper around the pre-`try` write, so it proves `restoreFileSnapshot()` works when called, not that the wrapper always reaches it.

**Minimal reproduction**

Run the wrapper with a controlled filesystem/write shim or fixture where the write of `.env.production.local` throws after the original snapshot has been captured. Observe that control never enters the `try/finally` block and `restoreProductionEnv()` is not called.

A deterministic regression can be built without any provider call by injecting/faking the file-write boundary.

**Zero-provider regression feasible:** yes.

**Impact / severity rationale**

This is a real engineering/release-verification hygiene defect that can alter a developer/verifier production-env file, but it does not directly corrupt customer audit evidence or deploy code. P2 is appropriate.

## Accepted non-blocking finding

### B-2 — P3 — `aria-controls` points to no element while the mobile menu is closed

**Relation:** `N-P2-14` — residual / partially resolved

**Exact boundary:** `src/components/LandingNav.tsx` — `MobileMenu()` conditional rendering and hamburger semantics

**Failure scenario**

The important original behavior is fixed: when closed, the mobile menu returns `null`, so hidden navigation items are not focusable. Opening focuses the first link, Escape closes, close returns focus to the hamburger, and resize closes stale mobile content.

However, the hamburger always renders:

`aria-controls="nuave-mobile-menu"`

while the controlled element itself exists only when `mobileMenuOpen` is true. In the collapsed state there is no element with that ID in the document. This leaves an invalid/dangling IDREF for assistive technology in the exact state where the disclosure is collapsed.

**Why existing tests missed it**

`public-truth-wave2.test.ts` is a static source-string assertion. It independently checks that `if (!open) return null` and `aria-controls={MOBILE_MENU_ID}` both exist, but does not assert their runtime relationship.

**Minimal reproduction**

At a mobile viewport, load a page with the menu closed and inspect the hamburger's `aria-controls` target. The button references `nuave-mobile-menu`, but `document.getElementById("nuave-mobile-menu")` is null until the menu opens.

**Zero-provider regression feasible:** yes, with a browser accessibility/DOM test.

**Impact / severity rationale**

The primary focusability/keyboard defect is fixed and navigation remains usable. This is a narrow semantic accessibility defect, so it is P3 rather than P2. It is non-blocking by itself.

## Customer-journey assessment

The frozen code supports the intended offline/stubbed customer sequence:

landing → one-shot source handoff → `/audit` → extraction → fact review/edit → prompt generation/review → run → report → variance → final report/export.

Observed protections include:

- landing submission itself performs no extraction; it stores one source handoff and navigates;
- invalid source remains on landing and cannot issue audit work;
- SourceHero uses the canonical source parser and disables duplicate submission while extracting;
- old workflow/variance state is cleared before a new landing source is handed off;
- customer-owned facts remain protected from later re-extraction replacement;
- prompt/run/report/variance operations retain Wave 1 generation/AbortSignal invalidation;
- variance failure preserves the completed report;
- restored completed variance does not duplicate the variance POST;
- evidence download uses the customer-safe projection.

The final PR CI browser suite independently reports the corresponding landing and variance behaviors green. No additional browser-path blocker was accepted in this lane.

## Public-truth assessment

`/faq`, `/terms`, `/privacy`, and `/support` consistently describe the product as private testing. The active pages no longer claim GPT-4o, active checkout/payment, email/private report delivery, persistent customer accounts, a specific price/refund/tax contract, server retention duration, or support SLA that the repository does not establish.

Unknown operator/legal/address facts are omitted rather than invented. Google Business Profile/Maps is explicitly described as unsupported primary intake. No N-P1-13 or N-P1-14 regression was found.

## Network / Playwright isolation assessment

`offlineE2EServerEnv()` builds an explicit server environment from a small inherited allowlist and overwrites provider-sensitive values:

- `NUAVE_LIVE_PROVIDER_TESTING=0`
- provider selectors forced to `opencodego`
- OpenCode/OpenAI/Gemini/Groq/OpenRouter credentials blanked or replaced with dummy values
- fixture overrides restricted to the two explicit fixture controls

The default, forced-failure, and preview-disabled Playwright modes all use the shared offline server constructor. `network-guard.ts` rejects every browser request whose hostname is not localhost/loopback.

No ambient `OPENAI_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `NUAVE_LIVE_PROVIDER_TESTING=1`, or `NUAVE_PROVIDER=gemini` path was found that can override the explicit Playwright server environment.

`N-P2-13` and `N-P2-15` remain supported as resolved.

## Spec004 assessment

`/audit/spec004` uses a local `OFFLINE_FIXTURE` and updates component state only. Its production code contains no audit API call. Permanent browser coverage asserts both no `/api/audit/*` request and no unexpected external host request.

`N-P2-10` remains resolved.

## Test discovery assessment

Normal unit discovery is explicitly constrained by `vitest.config.ts` to `src/**/*.{test,spec}.{ts,tsx}` and `tests/**/*.test...`, while `scripts/**` is excluded. Credentialed/live runner specs under `scripts/**/*.spec.ts` are only discoverable through the positively named `test:live-provider` command and `vitest.live-provider.config.ts`.

Thus both `npm run test:unit` and ordinary `npx vitest run` use the safe default configuration and cannot discover those script runners under the reviewed configuration.

`N-P2-16` remains resolved.

## CI / release assessment

Final PR CI run #453 (`32801362126`) was independently inspected.

`validate` completed successfully with:

- `npm run check`: PASS
- unit: **601/601** PASS
- Next build: PASS
- Cloudflare/OpenNext build-only: PASS using dummy build values
- default Playwright: **42/42** PASS
- forced-failure Playwright: **3/3** PASS
- preview-disabled Playwright: **2/2** PASS
- total browser: **47/47** PASS

The PR workflow checked the synthetic PR merge composed from the frozen Wave 2 head and frozen base, as expected for a GitHub pull-request run.

The same run shows:

- `Verify main came from merged PR`: **SKIPPED**
- `Deploy to Cloudflare Workers`: **SKIPPED**

The active `.github/workflows/ci.yml` has read-only `contents` and `pull-requests` permissions. Deployment is gated to `push` on `main`, requires both `validate` and `verify-main-origin`, and `verify-main-origin` rejects a main commit without an associated merged PR. No Wave 2 workflow change, temporary debug workflow, PR write permission, or PR provider-execution path was found.

The missing `deploy-pages.yml` path in the review prompt is stale; it is not an active second deployment path.

CI/release safety therefore remains green despite B-1, because B-1 affects the standalone local/offline wrapper, not the PR deployment guard.

## Rejected / downgraded claims

- Literal `npm run verify` was not separately run in the implementation harness: not a defect by itself; final CI proves all constituent gates and permanent helper coverage. B-1 is accepted because it is a concrete wrapper lifecycle flaw, not because the wrapper was not invoked.
- `deploy-pages.yml` missing: stale review-path expectation, not a release defect.
- Mobile nav original P2 focusability issue: fixed; only the narrower P3 dangling `aria-controls` residual remains.
- K-10 durable cross-tab/server-state architecture: Future/out-of-scope, not a Wave 3 blocker.

## Reviewer B final assessment

- P0: 0
- P1: 0
- P2: 1
- P3: 1
- Future: 0 in this lane

**Reviewer B verdict: BLOCK**

B-1 is a current-scope reproducible P2 defect with zero-provider regression coverage available. B-2 is a non-blocking P3 residual. No fix was performed.