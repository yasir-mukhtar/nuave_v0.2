# Protocol-v3 recovery prerequisite audit — blocked

Date: 2026-09-07

## Decision

**Recovery stopped before provider calls.** The eight existing S packs cannot be reused under the authorization because their records do not contain enough immutable protocol provenance to prove protocol fidelity.

## What was verified

For all eight S records:

- one recorded provider attempt;
- HTTP 200 response;
- completed response body and returned `gpt-5.6-luna` identity;
- `resp_*` response identity and usage/latency fields;
- final-output shape validation passed with zero recorded validation issues;
- fixture file and `buyer-decision-v3` contract identifiers are present;
- low reasoning, no search, zero retries/repairs/ranking are recorded.

## Blocking omissions

The immutable S run records do not preserve:

- the frozen S instruction text or its SHA-256 identity;
- the full outgoing request configuration and final schema payload identity;
- a recorded request-body hash that would prove the actual submitted instruction/schema matched the frozen protocol.

The current `instruction-s.md` and `output-schema.json` cannot fill those omissions after the fact without reconstructing provenance. Reuse must depend on protocol fidelity, not output quality, so reconstruction would be an unsupported assumption.

## Existing runs

S runs not reused:

- `stage1-S-v3-ac-repair-rich-1788742068657-88dafa`
- `stage1-S-v3-ac-repair-sparse-1788742098637-5ed81f`
- `stage1-S-v3-inventory-software-rich-1788742127977-e52eba`
- `stage1-S-v3-inventory-software-sparse-1788742154368-768b02`
- `stage1-S-v3-language-course-rich-1788742183788-2e6ec5`
- `stage1-S-v3-language-course-sparse-1788742211417-c98236`
- `stage1-S-v3-laptop-retailer-rich-1788742242527-3a9dc1`
- `stage1-S-v3-laptop-retailer-sparse-1788742273340-9675f3`

The eight original invalid P runs remain excluded as previously documented in `STAGE1-INTEGRITY-BLOCKER.md`; no records were changed or deleted.

## Consequence

No recovery amendment, corrected planner schema, recovery provider calls, or founder comparison package was created. The existing static review page remains technical-only and must not be used for acceptance. A future recovery needs either a new authorized S batch or an explicit founder decision that the missing S request provenance may be treated as an accepted exception; neither is assumed here.
