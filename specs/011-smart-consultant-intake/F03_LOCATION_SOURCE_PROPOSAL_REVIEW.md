# F-03 location-source proposal — orchestrator review

Date: 2026-09-24. Reviewed [the worker draft](./F03_LOCATION_SOURCE_PROPOSAL.md).

**Verdict: REVISE before implementation.** Retain the instruction-only search
direction. Settle the meaning of reach before accepting the proposed area-overflow
rule. This is a review recommendation, not founder approval or a spec amendment.

## Findings

1. **The recommended package does not resolve the nominated outcome.** The
   draft correctly discloses that a large directory still yields `beberapa`
   with no areas and disabled confirmation. It improves where extraction looks
   but leaves the founder's whole-brand preparation incomplete. Approving that
   rule would accept a product limitation; it is not completion of F-03/AC-07.
   I recommend revising it rather than implementing it as the completeness fix.

2. **Complete directory enumeration is a new rule, not the settled field
   contract.** Spec 011 R-02 bounds published area names at eight, R-05 preselects
   returned areas, and R-13 requires at least one for `beberapa`. It does not
   require proof that an entire outlet directory has been enumerated. The draft
   appropriately asks for an amendment, but this choice needs a clear purpose
   for the field. My worker brief raised the risk of silently narrowing a
   whole-brand audit; it did not settle exhaustive enumeration as the solution.
   Neither arbitrary truncation nor discarding all supported areas should
   become the default merely because the output has an eight-item cap.

3. **The existing national option warrants a meaning decision before a larger
   representation change.** `screens-bab2.tsx` describes `seluruh` as products or
   services available nationally; `question-facts-v3.ts` maps it to `national`.
   The confirmed-context schema already permits national reach without an area
   list. These facts show that an exhaustive city list is not required for every
   whole-brand audit. They do not themselves authorize classifying the nominated
   business as national. The founder should decide whether documented broad
   business presence can support that interpretation, with delivery limits kept
   separate, or whether exact served-area coverage is intended. A large outlet
   count alone must not determine the classification or evade the area cap.

## What the draft gets right

The inspected request ordering supports directing existing hosted search toward
relevant official locations/service-area evidence within the same extraction.
It avoids a second extraction after discovering an empty result and does not
add a direct document fetch. The distinction between requested search limits and
provider-internal behavior is appropriately qualified against the local code.
The draft also identifies the existing retry brevity instruction's four-item
limit, preserves unsupported optional values, separates source proposals from
confirmation, and makes no claim of proven live improvement.

I support carrying this method into the revision. It remains untested as a
semantic improvement and unapproved for implementation.

## Recommended decision and revision

**Recommended meaning, awaiting founder decision:** for a whole-brand audit,
reach describes the business's supported geographic presence through its stated
service channels, not a complete outlet inventory. Official evidence of a broad
national network may support a national proposal; that does not imply delivery
to every address. Local or regional availability stays local or regional.
Do not promote it to national just because more than eight places are listed.

The founder has been asked to choose between that broad-presence meaning and
exact served-area coverage. No answer or approval is assumed. No business value,
UI label, schema, instruction or approved specification changes in this review.

After the decision, revise the same draft into one complete bounded package:

- define the four reach choices and how official evidence supports each, without
  using a city-count threshold or mere aspiration as national evidence;
- explain the nominated whole-brand case's proposed representation and the
  confirmation path, keeping proposed interpretation distinct from source facts;
- state how genuinely regional evidence exceeding eight areas is handled without
  inventing a region, silently sampling a full market or introducing an
  exhaustive-directory requirement by default; escalate any remaining product
  choice rather than designing a multi-city platform;
- make the initial/retry instructions consistent with the chosen meaning and
  preserve the single extraction, budgets, origins and downstream truth; and
- include fictional local, regional-overflow and supported-national examples so
  a reviewer can see the resulting summary and whether confirmation is available.

Retain honest unknown states when evidence cannot support the chosen meaning.
If a case remains outside the bounded representation, name that limitation for
the founder; do not present a disabled summary as a completed acceptance outcome.

## Validation and handoff

Read the complete draft and checked its material claims against extraction
request/reservation/retry code, telemetry limits, preparation preselection,
confirmed market validation, reach labels and the writer projection. The review
also checked Spec 011's R-02/R-05/R-13 and the product's business-confirmation
purpose. No runtime or tests changed; no tests, fetches or provider calls ran.
The worker draft and approved spec/addendum are preserved.

Next: receive the founder's reach-meaning decision, then revise the draft before
seeking implementation approval. No new implementation or live allowance is
granted. Accounting remains USD 1.04786450 of 5 including the historical estimate.
F-01 stays closed; F-03/AC-07 stay open; Spec 011 stays Approved, not Verified.
