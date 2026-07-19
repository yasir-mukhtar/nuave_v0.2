# Nuave v0.2 agent instructions

For every product or implementation task, start with
[`docs/v2/README.md`](./docs/v2/README.md) and load only the specialist context
relevant to the task.

For artifact, prototype, UX, copy, acquisition, conversion, report, or
aftersales work:

1. read [`docs/v2/ARTIFACT_STATUS.md`](./docs/v2/ARTIFACT_STATUS.md);
2. follow [`docs/v2/ARTIFACT_WORKFLOW.md`](./docs/v2/ARTIFACT_WORKFLOW.md);
3. work only on the current phase and bounded next task unless the founder
   explicitly changes scope;
4. use the shared fixture and upstream artifact contracts;
5. update the artifact manifest, live tracker, and next exact task in the same
   change as the artifact; and
6. record material strategy changes in `docs/v2/DECISION_LOG.md` rather than
   silently settling them in an artifact.

Repository files are the source of truth between sessions. Chat history is not
the progress tracker.

Before editing, briefly report:

  - current phase and status;
  - next exact task;
  - governing files you will use;
  - files you expect to create or modify;
  - unresolved decisions that could block the task.

  Work on one bounded deliverable. Use the shared fixture and upstream artifact
  contracts. Do not silently change settled decisions, clinic facts, the offer,
  measurement definitions, or lifecycle states.

  At the end:

  - validate the artifact against the workflow acceptance questions;
  - update the artifact manifest;
  - update ARTIFACT_STATUS.md, including the checklist, progress log, and next
  exact task;
  - update DECISION_LOG.md only for material cross-cutting decisions;
  - do not mark the phase complete unless its exit gate passes;
  - report the files changed, decisions made, remaining blockers, and next task.

  Do not commit or push unless I explicitly request it.
