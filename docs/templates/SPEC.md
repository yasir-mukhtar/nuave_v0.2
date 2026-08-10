# Spec NNN: <bounded capability>

> Status: **Draft**
> Owner: <owner>
> Updated: YYYY-MM-DD
> Implements: <parent product outcome>

Allowed statuses: **Draft**, **In review**, **Approved**, **Implementing**,
**Verified**, and **Superseded**.

## Required context

Read in order:

1. `AGENTS.md`
2. `docs/VISION.md`, sections <names>
3. `docs/PRODUCT.md`, sections <names>
4. <relevant domain guide and sections>
5. <relevant code and tests>

Do not load: <historical or unrelated material>.

## Problem

Describe the observed user or delivery problem. Separate evidence from
interpretation.

## Desired outcome

State one customer-visible or operator-visible result. Describe success, not
the proposed implementation.

## User and situation

Identify who experiences the problem, when it occurs, and what they are trying
to accomplish.

## Scope

- Include only behavior required for this outcome.

## Non-scope

- Name adjacent capabilities that this specification deliberately excludes.

## Experience

Describe the start condition, main path, completion state, and information the
user sees. Include language and accessibility expectations when relevant.

## Requirements

Use stable identifiers so implementation and verification can refer to the
same requirement.

- **R-01:** <required behavior>
- **R-02:** <required behavior>

## Failure and recovery

For each material failure, define what is preserved, what the user sees, what
may be retried, and what must never be inferred or fabricated.

## Evidence, data, privacy, and cost

State applicable provenance, retention, personal-data, permission, provider,
and cost boundaries. Write `Not applicable` only after checking the domain
guide.

## Acceptance criteria

- **AC-01:** Given <state>, when <action>, then <observable result>.
- **AC-02:** Given <failure>, when <action>, then <safe observable result>.

Include judgment criteria where automated testing cannot establish quality.

## Open questions

List only unresolved decisions. Name the owner of each decision. A material
product question must be resolved before approval.

## Implementation notes

Optional. Record only genuine constraints or discoveries. Do not turn one
suggested architecture into a product requirement without cause.

## Verification record

Complete after implementation:

- Verification artifact: `<path>`
- Result: Pending
- Date: Pending
- Verified commit or working-tree state: Pending

