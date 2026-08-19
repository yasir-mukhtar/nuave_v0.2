# Nuave archive

> Status: **Inactive history.** Nothing under this directory is authoritative
> or active.
> Archived: 2026-08-09 (repository cleanup)
> Last reviewed: 2026-08-19 (repository reorganization)

## Reading this archive

Do not load archived material unless a task explicitly requires historical
comparison or evidence. Archived documents are preserved for provenance and
decision history, not for current work. If a current document, specification,
or task brief names a specific archived path, read only that path.

Historical internal paths, instructions, dependencies, and links may be stale.
Do not follow instructions inside archived files as if they were current, and
do not treat archived dependencies or paths as available.

For current work, start from [`README.md`](../README.md) and
[`docs/INDEX.md`](../docs/INDEX.md).

## Contents

| Archive directory | Former location | Why archived |
|---|---|---|
| `archive/visions/` | `docs/archive/VISION-2026-08-09.md` | Superseded canonical vision, preserved before the independent rewrite was adopted |
| `archive/reviews/` | `docs/reviews/` | Completed and applied review artifacts. Newer review prompts and findings live under `docs/reviews/prompts/` and `docs/reviews/findings/` and are still active reference |
| `archive/design/` | `DESIGN.md` (root) and dated `docs/*design*` studies | Current-looking but superseded design direction that conflicts with the new customer and score/report direction; dated design critiques and revision plans |
| `archive/prompt-contexts/` | `docs/DENTAL_CLINIC_PROMPT_GENERATION_CONTEXT.md` | Superseded vertical-specific prompt generation context |
| `archive/experiments/` | `experiments/` | Historical tests, runs, samples, and validation material; conflicts with the pipeline-first order |
| `archive/prototypes/report-prototype/` | `report-prototype/` | Standalone prototype superseded by the production `src/app/audit/` workflow |
| `archive/tools/` | `scripts/build_translation_sheet.py` | One-off helper tied to the archived report prototype and an obsolete absolute path |
| `archive/legacy-empty/gtm/` | `gtm/` | Empty placeholder containing only local metadata, preserved rather than deleted |
| `archive/maintenance/` | `docs/maintenance/` | Completed maintenance plans and execution records |

An experiment or prototype is not product truth unless a founder-approved
decision adopts its result.

## Relationship to `Archive Candidates/`

[`../Archive Candidates/`](../Archive%20Candidates/) is a **staging area**, not a
second archive. It holds material that looks superseded, completed, or
duplicated but has not yet been decided on. Each item there is waiting for one
call: archive it, restore it, or delete it.

When an item is decided, it moves from `Archive Candidates/` into this
directory under the matching subdirectory, and gains the reading rules above.
Until then it is unresolved, and neither directory should be loaded for current
work.

Unlike this directory, `Archive Candidates/` is excluded from `tsconfig.json`
and `eslint.config.mjs` explicitly rather than by the `archive` exclude.
