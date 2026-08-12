# Nuave specifications

Specifications convert canonical product direction into bounded,
implementation-ready behavior.

## Structure

Each capability uses a numbered directory:

```text
specs/
  001-short-capability-name/
    SPEC.md
    VERIFICATION.md
```

Copy [`../docs/templates/SPEC.md`](../docs/templates/SPEC.md) when starting a
specification. Add `VERIFICATION.md` from the verification template when
implementation begins.

## Lifecycle

1. **Draft:** the outcome, scope, or decisions are still being developed.
2. **In review:** the candidate is complete enough for contradiction and
   acceptance review.
3. **Approved:** the founder or delegated authority has approved the product
   behavior; implementation may begin.
4. **Implementing:** code is being changed against the approved spec.
5. **Verified:** independent verification passed every required acceptance
   criterion or records an explicit founder-approved exception.
6. **Superseded:** a newer named specification replaces this one.

Do not implement a draft. Do not mark a spec verified because the build passes;
verification is against its acceptance criteria.

## Scope rules

- One spec owns one reviewable user outcome.
- A spec links to parent guidance instead of copying it.
- Requirements use stable IDs; acceptance criteria use stable IDs.
- Non-scope is mandatory to prevent adjacent automation.
- A product conflict returns to the orchestrator and founder.
- An implementation discovery may update an approved spec only through an
  explicit reviewed change.
- The specification package records evidence, not a diary of agent activity.

## Active specification

[`001-simulated-journey-shell/SPEC.md`](./001-simulated-journey-shell/SPEC.md)
is the only active specification. Its status is **Implementing**. Implementation
proceeds against the approved spec in bounded chunks; independent verification
is recorded in the spec package's `VERIFICATION.md`.

[`../docs/NOW.md`](../docs/NOW.md) names the current outcome and next action. If
no active spec is named, the next task is to prepare or approve one rather than
begin broad implementation.
