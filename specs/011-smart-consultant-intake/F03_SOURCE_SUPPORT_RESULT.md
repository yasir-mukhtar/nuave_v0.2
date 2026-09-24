# F-03: single-page source-support result

Date: 2026-09-24 (Asia/Jakarta). Worker execution of
[F03_SOURCE_SUPPORT_WORKER_PROMPT.md](./F03_SOURCE_SUPPORT_WORKER_PROMPT.md).

**Check completed; allowance consumed.** The inspected homepage statements do
not establish an unambiguous current market reach or a specific target customer.
The relevant geographic wording is retained by the unchanged selector, but is
framed as an ambition. This check establishes no source-specific code defect.
No product change or provider call was made.

## Observed evidence

The exact nominated homepage was retrieved once with the unchanged
`safeFetchPublicResource`, `kind: "html"`, `htmlScope: "document"`. Strict UTF-8
decoding and the unchanged `selectSourceExcerpt` operated on that same document
in memory. A static parser inspected the resulting public business text without
rendering, scripts or resource loading.

Requested/final URLs, the observation time, two short literal fragments totaling
**16 quoted words**, structural context and interpretation are in the owner-only
note outside this public repository:
`/private/tmp/nuave-f03-source-support-32ikazkd/source-support-note.json`.
Requested and final URLs were identical. No business-specific passage or URL is
copied into this repository result.

| Meaning | Explicit source support | Selector result | Interpretation |
|---|---|---|---|
| Market reach | No unambiguous current coverage found in the inspected statements. One paragraph describes a geographic ambition; app-ordering text mentions pickup/delivery without naming service areas. | The complete normalized geographic paragraph and app-ordering paragraph are retained. The geographic paragraph is a `p` under `main/article/.../figure/figcaption`. | An ambition does not establish current coverage. No single reach enum is justified, and no selector loss is demonstrated. |
| Optional target customer | No explicit segment established in the inspected candidate statements; customer references are generic. | The generic customer references survive selection. There is no supported segment passage whose exclusion can be diagnosed. | Keep the optional value unknown; do not infer demographics from the category, brand or ordering method. |

| Execution measurement | Result |
|---|---|
| Attempt recorded before retrieval | 2026-09-23T19:07:03.934Z |
| HTTP GET dispatched / response headers received | 2026-09-23T19:07:05.253Z / 19:07:05.519Z |
| Document read, selection and screening completed | **2026-09-23T19:07:05.688Z** — 2026-09-24 02:07:05.688 Jakarta |
| Retrieval attempts / actual HTTP requests | **1 / 1** |
| HTTP responses / completed document reads | **1 HTTP 200 / 1** |
| Redirect responses / followed redirect requests | **0 / 0** |
| Retries / denied destinations | **0 / 0** |
| Decoded document / selected excerpt bytes | **297,710 / 1,426** |
| Source bounds | Existing 512 KiB decoded bytes, 5 s request / 10 s total, maximum three redirect hops; unchanged |
| Destination limiter | Standalone local cap of four charges (initial plus maximum redirects); one charge used. This is not the production rate-limit binding. |
| Provider or `/api/audit/*` calls | **0 / 0** |
| Periksa, business edits, confirmation or downstream actions | **0** |
| Model-cost total | **USD 1.04786450 of 5**, unchanged; includes the historical estimate |

The transport wrapper permitted only the nominated HTTPS host with `www`
equivalence; offline checks proved unrelated redirects stop before another request. The
unchanged fetcher retained DNS/address, media, byte and deadline protections.
No credentials were read or passed. No extra HEAD, icon, page, search engine,
browser, application startup or model call was used.

## Interpretation and next action

The selected geographic paragraph fits within the 8,000-byte excerpt cap and
survives intact. No loss of this particular statement is demonstrated by the
current selector; this does not classify the earlier empty result. Its aspirational wording
also does not require the extractor to select national or international reach.

The [extraction instruction](../../src/lib/audit/openai.ts#L342) already requires
website-supported facts, prohibits inferred target demographics and leaves
unsupported fields empty. Its [reach instruction](../../src/lib/audit/openai.ts#L350)
lists enum tokens without the full [UI labels](../../src/lib/intake/SmartSummary.tsx#L42)
or an explicit present-coverage-versus-ambition example. That is a possible
instruction clarification, not an established cause or a justified fix here:
the inspected wording still does not establish one current reach value.

**Recommended next action:** review this evidence, then use the existing owner
selection when the founder supplies the intended market reach and any required
areas. Preserve `Dari Anda` for that choice. Leave target customer optional unless
the founder supplies it or explicit source support is separately established.
No selector expansion, extraction-prompt change, added retrieval or paid retry
is justified by this check alone. Owner completion does not demonstrate that
automated preparation achieved the representative rich local target.

## Limits and validation

- This is one current static homepage document. It is not evidence of absence
  across the website, linked locations, dynamically rendered text or all markets.
- The helper screened 20 visible non-contact text blocks and identified six
  candidates using geography/service/audience terms; the worker inspected those
  candidates. This is a bounded inspection, not an exhaustive semantic proof of
  absence from all document content. Hidden/navigation/contact/profile/review
  and embedded content were excluded from evidence.
- The current document is not a reconstruction of the previous extraction
  input. Its earlier excerpt was not retained and hosted search also ran.
  The historical source-access versus extraction-omission cause remains unresolved.
- Sensitive-text screening passed for the inspected candidates. Full HTML and
  the full excerpt were never printed or persisted; the helper released its
  in-memory source text and exited. This is not a claim of perfect privacy detection.
- Before dispatch, the existing selector and safe-fetch suites passed:
  **124 tests in two files** (57 selector, 67 safe-fetch). Ten temporary fictional
  helper checks passed, including same-host redirect counts, off-host/private
  rejection before a second transport, redirect/limiter bounds, private DNS,
  strict UTF-8, HTTP failure without retry, and sensitive/excluded text handling.
  No broad gate was repeated.

Private evidence directory: `/private/tmp/nuave-f03-source-support-32ikazkd/`.
It contains the exclusive dispatch claim, sanitized request metrics, test log,
helper checks/code, public-source note, content hashes (not source payloads) and
preservation inventory. Prior evidence and sessions remain untouched.

The only repository addition is this result. The 580 pre-existing inventoried
files, including product/tests/spec and four protected notes, are unchanged;
branch/HEAD and empty index are preserved. `git diff --check` passes.
No staging, commit, push, publication, deployment or agent dispatch occurred.
The orchestrator will reconcile current status after reviewing this result.

**F-01 stays closed. F-03/AC-07 stay open. Spec 011 stays Approved, not Verified.**
