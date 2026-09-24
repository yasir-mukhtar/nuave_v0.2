# F-03: official location evidence — proposal worker prompt

You are the worker drafting one bounded proposal for Nuave.

Repository: `/Users/hy4-mac-006/nuave_v0.2`.
Branch: `devin/sol-smart-consultant-intake-plan`; expected HEAD: `2a21f85`.
Preserve the existing working tree. This is a documentation task, not an
implementation handoff. Do not switch/reset/stash, stage, commit or push.

**Objective:** propose the smallest change that lets ordinary preparation use
relevant official locations/service-area evidence when the submitted homepage
does not establish required reach. The customer should review a supported
proposal rather than retype public facts. Produce one reviewable recommendation
and identify any founder decisions; do not silently settle new product policy.

The founder requested this follow-up prompt on 2026-09-24 after supplying an
official outlets page. Drafting and local code inspection are authorized.
Implementation, new source fetches and provider calls are not part of this task.

## Required context, in order

1. `AGENTS.md`, `README.md`, `docs/NOW.md`, `docs/WORKFLOW.md`.
2. `specs/011-smart-consultant-intake/SPEC.md`: **Settled product decisions**,
   **Desired outcome**, **Scope**, **Non-scope**, **Experience**, **Requirements**,
   **Failure and recovery**, **Acceptance criteria**, and **F-03 product correction**.
3. `F03_PRODUCT_CORRECTION_SCOPE.md`: **Product integration boundary**,
   **Source selection and privacy**, **Failure behavior and customer copy**,
   **Output facts and provenance**, and **Files and regression boundary**.
4. `F03_COMPLETENESS_REVIEW.md`, `F03_SOURCE_SUPPORT_RESULT.md`, and
   `ACCEPTANCE_EVIDENCE.md` sections **2026-09-24: Source-support result reviewed**
   and **2026-09-24: Founder supplied official outlets source**.
5. The existing minimal public-source note:
   `/private/tmp/nuave-outlets-source-ttw37ga2/outlets-source-note.json`.
   It contains the supplied source, dated observation and limits, not raw
   provider evidence. If unavailable, use the sanitized acceptance record and
   identify the missing detail; do not refetch the website or infer new facts.

Paths without a directory above refer to this spec package. Read named sections
fully. For implementation discovery, inspect only the active path:
`src/lib/intake/SmartIntakeJourney.tsx` → `src/app/api/audit/extract/route.ts` →
the live extraction boundary under `src/lib/audit/` → `openai.ts` →
`src/lib/intake/smart-intake-contract.ts` → `SmartSummary.tsx`.
Also inspect `source-excerpt.ts`, `safe-source-fetch.ts`, extraction schemas,
budget/reservation/retry helpers and directly relevant existing tests as needed.
Do not read `.secrets/`, old private/provider payloads, diagnostic runners,
protected local notes, `archive/`, or unrelated plans. Do not execute any prior
live handoff or source-check helper.

## Settled evidence and limits

- The homepage-only check found retained aspirational geographic wording and
  justified no selector fix. Its allowance is consumed; preserve that result.
- The later founder-supplied outlets page provides published multi-city outlet
  evidence and named areas. It supports a `beberapa` proposal/area suggestions;
  no exact enum/city selection has been confirmed. Source information remains
  website evidence even though the founder supplied the link. Existing row
  origins and the owner-origin transition after an edit remain unchanged.
- Outlet presence is different from delivery coverage. A contact address,
  ambition or outlet count alone must not become universal domestic/overseas
  service. The directory does not establish an optional customer segment.
- The current extractor already has official-domain-restricted hosted search.
  Do not describe product preparation as homepage-only. The new evidence does
  not prove which source the earlier model accessed or why reach was empty.
- One identity request and one extraction request remain the target. There is
  already one server-owned document read and an 8,000-byte excerpt limit.
  Prepared values remain proposals until the customer's single confirmation.

## Deliverable

Create **only**
`specs/011-smart-consultant-intake/F03_LOCATION_SOURCE_PROPOSAL.md`, clearly marked
**Draft — requires founder approval before implementation**. Aim for about
800–1,200 words, expanding only for a decision that cannot be stated safely in
that space. Include:

1. **Problem and evidence.** Separate observed evidence, interpretation and
   unknown historical cause. Cite the retained sources; do not invent a new
   experiment, source statement or successful product behavior.
2. **Recommended bounded approach.** Trace the current request ordering with
   code references. First assess using the existing hosted-search extraction
   more explicitly for official location/service-area evidence. Compare it
   briefly with at most one additional server-owned official-page read if that
   is necessary; recommend one approach and state the tradeoff. Do not present
   an untested prompt change as a proven cure or add retrieval by default.
3. **Exact execution boundary.** Explain how an ordinary homepage input reaches
   the useful evidence without requiring the founder to supply a second URL.
   State when discovery/selection happens, source ownership, same-site limits,
   maximum page/model/search-tool work, shared text/time/budget bounds and
   reservation/retry behavior. A design that discovers empty reach only after
   extraction and then re-extracts uses another model call; do not hide that
   under the existing one-call boundary. No new model call or retry for a valid
   partial result is the baseline constraint. If it cannot work within that
   constraint, report the conflict for the founder instead of assuming approval.
4. **Meaning and customer behavior.** Distinguish published operating locations,
   delivery/service areas, contact addresses and aspirations. Explain proposed
   reach/area origins, unknown states, owner corrections and source disclosure.
   Address the current eight-area maximum and preselection of every returned
   `beberapa` area: a large directory must not silently become an arbitrary
   eight-city whole-brand market, nor be relabelled national to evade the cap.
   State any necessary product decision explicitly, with a recommendation for
   the founder. Do not design a multi-city platform or change schemas here.
5. **Failures and protections.** Cover no relevant page, ambiguous evidence,
   multiple candidate links, unsafe/unreadable/rate-limited content and sensitive
   content. Specify how existing protections and stable customer work survive.
   Do not propose silent privacy/rate bypasses, raw-content persistence, per-value
   evidence matching, or retries to improve optional completeness.
6. **Amendment, size and verification.** Name the exact Spec 011/addendum rules
   the recommendation would change and the small set of likely code/test files.
   List any unresolved founder decisions rather than rewriting the approved spec.
   Give observable acceptance cases: useful official location evidence, only
   aspirational/contact evidence, unsupported optional target, more than eight
   areas, source failure and preserved cost/retry/origin/confirmation behavior.
   Distinguish offline tests from any later separately authorized live check.

Preserve the approved model/provider, sole emergency switch, safety/rate controls,
carryover/cost ceiling, direct-ten question path, report/export contracts and
historical hold. No broad crawl, guessed `/outlets` paths, external directory,
browser-rendering service, business-specific hardcoding or general research agent.
A proposed extra-page read or instruction change must be an explicit amendment,
not an action taken under the consumed diagnostic or current implementation scope.

## Validation and completion

This task permits local inspection and the one draft file only. Do not fetch
the supplied page again, open the app, alter business selections, run Periksa,
make model calls, edit product/tests/spec/status files, or dispatch another agent.
No broad test gate is needed. Check cited local paths/sections and code references,
inspect the complete new draft and run `git diff --check`; preserve existing work.

Return the draft path, recommendation in plain language, exact founder decisions
needed, files changed, checks actually run and next smallest action. Do not claim
implementation approval, live validation or acceptance closure. Model accounting
remains USD 1.04786450 of 5 including the historical estimate. F-01 stays closed;
F-03/AC-07 stay open; Spec 011 stays Approved, not Verified.
