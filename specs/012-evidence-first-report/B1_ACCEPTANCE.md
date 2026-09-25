# Spec 012 B1 — orchestrator acceptance

> Date: 2026-09-25
> Status: **Accepted for the bounded offline B1 implementation**
> Spec 012 remains **Approved / in progress**, not Verified

The founder relayed the independent reviewer’s PASS. The orchestrator read
the complete worker result and review, checked their evidence identity, and
accepts B1 without a corrective implementation task. This is technical
acceptance, not founder usefulness judgment or publication authorization.

## Accepted candidate and authority

- Candidate: `/private/tmp/nuave-spec012-b1-M1I6nTcs/repo/`, branch
  `codex/spec012-b1-report-content`, unstaged and uncommitted.
- Base: `8907d96d10ca101f6fdd68c8c77607cd994d83f3`, containing report A,
  verified Spec 011 and the released privacy correction.
- Authority: `9c5d4c0f5e1ec3d59f5fd90c4f5d88ee1e1a7174:specs/012-evidence-first-report/SPEC.md`;
  SHA-256 `294ac792c347d0ccce12e6d40f6250b72aaaa038d9ea7313c212421a205e4110`.
  The broader documentation-branch promotion remains separate.
- Scope: 18 code/test files plus the worker result and verification entry.
  The [original handoff](./B1_WORKER_PROMPT.md) defines the approved boundary.
- [Worker result](./B1_IMPLEMENTATION_RESULT.md):
  SHA-256 `7f72228a75ccb771d8e854c01ff958ffad81380d740f5c2f19eadae1de023339`.
- [Independent review](./B1_IMPLEMENTATION_REVIEW.md):
  SHA-256 `24d6b6644647f9946c300ff82649480993e1101034c6b4bda67b34201e2e8704`.

This durable note retains the decision and evidence fingerprints. The worker
result and review are preserved verbatim alongside it. Scratch paths in those
records identify local supporting artifacts, not permanent public evidence URLs.

## Outcome and attributed verification

| Acceptance | Result |
| --- | --- |
| AC-11 | Up to ten supported findings/actions and order ten; three stay three, eleven fails, and B1 keeps minimum one. Existing gap and recovery rules remain. |
| AC-12 | All four report adapters receive the bounded guidance. New synthesis versions record the changed contract. Language behavior, calls, retry eligibility and accounting remain unchanged. |
| AC-13 | Header identity/scope follows the confirmed context. Observation dates and actual answer models come from retained evidence; UTC is explicit and report creation time stays separate. Contents match the body. |
| Inherited A / AC-10 and B1 AC-19 | Offline evidence supports exact answers, safe presentation, references, report-local navigation, exports, historical hold and no-repeat behavior within the B1 allowlist. |

The reviewer independently passed **305 focused tests, four additional probes
and one affected browser regression**, checked patch reconstruction and hashes,
and inspected **all 11 PDF pages**. The reviewer reused the matching worker’s
successful canonical `npm run verify`: **1,429 tests, both builds and 32 browser
checks**. The full gate was not independently rerun.

At acceptance, the orchestrator matched all **20 changed-file hashes** and
**327 product/test/script/configuration hashes** to the reviewer’s manifests,
confirmed the approved spec, patch, canonical log and retained PDF hashes,
and checked candidate whitespace. No tests or PDF inspection were repeated.
The candidate remained unchanged. Acceptance-check records are at
`/private/tmp/nuave-b1-acceptance-qr5a9x4l/`.

| Retained artifact | SHA-256 |
| --- | --- |
| `evidence/b1-code.patch` | `11df20b3b25fe3023efb6b61bb262c7d2c6fb0e880ece4e9dafe0f9d21821f28` |
| `evidence/verify.log` | `67a43f74e3a784838594cd137e116bb161d720d269fbd6b26057e5430a8cf9f8` |
| Reviewed `report-print-a4.pdf` | `257944bccbcfac6dd3377108c1a11d7193474271c7712ea99191f47cb6210493` |

## Limits and next step

Gemini’s provider-side schema conversion limitation predates B1. Its shared
post-response validation remains in place; Gemini is testing-only and does
not support the v2 context path. This acceptance does not certify its
provider-side schema or add an unrelated repair to B1.

Mocked responses do not establish improved real synthesis or owner usefulness.
Native PDF Save, physical-phone behavior and native browser zoom remain
untested; CSS zoom and headless printing do not close those limits.

## Publication authorization and package

The founder said **“Proceed with B1 publication package and draft PR”**, then
clarified **“You publish B1; worker prompt covers B2.”** This authorizes the
bounded commit, push and draft PR, including the existing automatic synthetic
preview workflow. It does not authorize merge, production deployment or live
provider calls. No separate approval is needed to carry out this publication.

Publication uses an isolated checkout at
`/private/tmp/nuave-b1-publication-72lfuzyn/candidate/`, branch
`codex/spec012-b1-publication`. Current remote main was checked and fetched on
2026-09-25 and still matches base `8907d96`. The 25-file package consists of the
20 reviewed worker files, the verbatim independent review, this acceptance,
the completed worker handoff and narrow NOW/INDEX status changes. Reviewed
runtime/tests and worker records remain byte-identical. No broad documentation
promotion, protected notes, screenshots, PDF, raw logs or real customer evidence
are included. Original candidate and shared product files remain unchanged.

The unchanged canonical gate is reused with matching hashes. Publication
checks inspect the entire staged diff, exact file list, links, whitespace,
protected-file exclusion and unintended-secret/debug changes. Required CI and
independent published-PR review must be assessed on the eventual head; this
record does not claim they already passed. Publication fingerprints and the
completed PR result are retained outside the product tree at
`/private/tmp/nuave-b1-publication-72lfuzyn/`.

After B1 integration, B2 covers the constrained non-corrective action path,
final usefulness minimum and answers-only recovery. B2, combined verification
and the founder’s AC-18 before/after usefulness judgment remain outstanding.
Spec 011 stays Verified; F-01/F-03/AC-07 stay closed. No live/provider call,
source fetch or spend occurred. Accounting stays **USD 1.06241155 of 5**.
