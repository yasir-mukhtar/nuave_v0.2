# Repository cleanup plan

> Status: **Executed**
> Approved by: Founder
> Orchestrator: Codex
> Date: 2026-08-09
> Constraint: Archive named material; delete no file.

## Objective

Make the active Nuave repository easy to navigate without destroying historical
work. Keep only current product guidance, specifications, the production
application, and active supporting tools in the main paths. Move obsolete or
superseded experiments, prototypes, design work, reviews, and contexts intact
under one top-level `archive/` directory.

This is repository organization, not a product or implementation change.

## Safety rules

1. Delete no file and discard no content.
2. Move only the paths named in the manifest below.
3. Preserve tracked, untracked, ignored, and binary contents inside a moved
   directory. In particular, preserve the untracked
   `report-prototype/redesign/` work.
4. Do not modify application behavior, dependencies, canonical product
   decisions, source code, tests, prompts, or environment files.
5. Preserve the founder's and orchestrator's current working-tree changes.
6. Do not commit or push.
7. Do not rewrite historical archive contents to make them look current.
8. Use moves, not copies followed by deletion. Empty source directories may
   disappear as the natural result of moving their contents.
9. Do not touch root `.next/`, root `node_modules/`, local environment files,
   `.claude/`, `.impeccable/`, or `.obsidian/`. They are generated or local
   machine state and are not part of this documentation cleanup.

## Active paths to preserve in place

The following remain active:

- `AGENTS.md`, `CLAUDE.md`, and `README.md`;
- root configuration, dependency, CI, and environment-example files;
- `docs/VISION.md`, `docs/PRODUCT.md`, `docs/AUDIT.md`, `docs/NOW.md`,
  `docs/DECISION_LOG.md`, `docs/INDEX.md`, and `docs/WORKFLOW.md`;
- `docs/PROMPT_GENERATION_CONTEXT.md`;
- `docs/briefs/`, `docs/templates/`, and this cleanup plan while work is in
  progress;
- `specs/`;
- `src/`, `public/`, and `skills/generate-ai-visibility-prompts/`;
- root `package.json`, lockfile, TypeScript, Next.js, ESLint, PostCSS, and CI
  configuration; and
- all current uncommitted edits to those paths.

Do not create `docs/VOICE.md`, `docs/DESIGN.md`, `docs/GTM.md`, or an active
feature specification during this cleanup.

## Exact archive manifest

Move each source to the exact destination. Create destination parents as
needed.

| Source | Destination | Reason |
|---|---|---|
| `docs/archive/VISION-2026-08-09.md` | `archive/visions/VISION-2026-08-09.md` | Superseded canonical vision |
| `docs/reviews/001-vision-alignment-audit.md` | `archive/reviews/001-vision-alignment-audit.md` | Completed and applied review |
| `DESIGN.md` | `archive/design/DESIGN.md` | Current-looking but superseded design direction; conflicts with the new customer and score/report direction |
| `docs/design-critique-2026-08-06.md` | `archive/design/design-critique-2026-08-06.md` | Dated design review |
| `docs/navy-cover-design-revision-plan.md` | `archive/design/navy-cover-design-revision-plan.md` | Superseded prototype plan |
| `docs/stripe-design-revision-plan.md` | `archive/design/stripe-design-revision-plan.md` | Superseded prototype plan |
| `docs/stripe-landing-design-study-2026-08-07.md` | `archive/design/stripe-landing-design-study-2026-08-07.md` | Historical reference study |
| `docs/DENTAL_CLINIC_PROMPT_GENERATION_CONTEXT.md` | `archive/prompt-contexts/DENTAL_CLINIC_PROMPT_GENERATION_CONTEXT.md` | Superseded vertical-specific context |
| `experiments/` | `archive/experiments/` | All current contents are historical or conflict with the pipeline-first order; preserve the tree intact |
| `report-prototype/` | `archive/prototypes/report-prototype/` | Standalone prototype superseded by the production `src/app/audit/` workflow; preserve tracked, ignored, binary, and untracked redesign contents intact |
| `scripts/build_translation_sheet.py` | `archive/tools/build_translation_sheet.py` | One-off helper tied to the archived report prototype and an obsolete absolute path |
| `gtm/` | `archive/legacy-empty/gtm/` | Empty placeholder containing only local metadata; preserve rather than delete |

If a named source does not exist, stop and report it. If a destination already
exists unexpectedly, stop and report it. Do not merge directories or invent a
different destination.

## Required active-file updates

After the moves, make only these routing and tooling changes:

### `archive/README.md`

Create an archive index that:

- states that nothing under `archive/` is authoritative or active;
- tells agents not to load archived material unless a task explicitly requires
  historical comparison or evidence;
- lists each archive directory, its former location, and why it was archived;
- warns that historical internal paths, instructions, dependencies, and links
  may be stale; and
- points back to `README.md` and `docs/INDEX.md` for current work.

### `README.md`

- Remove the "Current offer validation experiment" row.
- Replace references to `experiments/EXP-001/` with a single concise pointer to
  `archive/experiments/` as non-authoritative history.
- Do not add individual archived files to the main start-here table.

### `docs/INDEX.md`

- Change the archive pointer to `../archive/`.
- State that no canonical `docs/DESIGN.md` exists yet; point to
  `../archive/design/` only as historical evidence.
- Replace the active `experiments/` and `report-prototype/` descriptions with
  concise archive pointers.
- Keep active documents and default context instructions unchanged.

### `AGENTS.md`

Add one explicit rule: do not read or use `archive/` unless the task names a
specific archived path for historical comparison or evidence.

### `docs/DECISION_LOG.md`

Repair only the archived-vision location in the 2026-08-09 vision-adoption row:
change `docs/archive/VISION-2026-08-09.md` to
`archive/visions/VISION-2026-08-09.md`. This is path maintenance, not a change
to the decision.

Do not edit other historical paths or wording in the log.

### `tsconfig.json`

Replace the obsolete `report-prototype` exclusion with `archive` so TypeScript
does not compile archived prototype source.

### `eslint.config.mjs`

Add `archive/**` to `globalIgnores` so archived JavaScript and TypeScript are
not linted as active code.

## Cleanup-plan closeout

After all moves and validation succeed:

1. Update this plan's status to **Executed**.
2. Add an execution record containing the date, exact paths moved, active files
   edited, validations run, and any exception.
3. Move this plan to
   `archive/maintenance/REPO_CLEANUP_PLAN-2026-08-09.md`.

Do not leave another copy under `docs/maintenance/`.

## Acceptance checks

The worker must verify all of the following:

1. Every manifest source is absent from its former location and present at its
   exact archive destination.
2. No manifest content was lost, including untracked
   `archive/prototypes/report-prototype/redesign/` files.
3. These active top-level entries remain:
   `AGENTS.md`, `CLAUDE.md`, `README.md`, `archive/`, `docs/`, `public/`,
   `skills/`, `specs/`, and `src/`, plus build/configuration files.
4. The obsolete top-level entries `DESIGN.md`, `experiments/`,
   `report-prototype/`, `scripts/`, and `gtm/` no longer remain.
5. `README.md`, `docs/INDEX.md`, and `AGENTS.md` route agents away from the
   archive by default.
6. All local Markdown links in active Markdown files resolve. Archived
   historical links are not acceptance blockers.
7. `git diff --check` passes.
8. `npm run check` passes after `archive/**` is excluded from TypeScript and
   ESLint.
9. `git status --short --untracked-files=all` shows moves/edits but no missing
   active source, configuration, or canonical document.
10. Nothing is committed, pushed, published, or deleted.

## Completion report

Report:

1. paths moved;
2. active files edited;
3. checks and results;
4. any exception or unexpected path;
5. confirmation that all content, including untracked redesign work, was
   preserved;
6. confirmation that no file was deleted and nothing was committed or pushed;
   and
7. the final location of this executed plan.

## Execution record

- **Executed:** 2026-08-09
- **Status:** Executed.
- **Paths moved (12 manifest rows):**
  - `docs/archive/VISION-2026-08-09.md` → `archive/visions/VISION-2026-08-09.md`
  - `docs/reviews/001-vision-alignment-audit.md` → `archive/reviews/001-vision-alignment-audit.md`
  - `DESIGN.md` → `archive/design/DESIGN.md`
  - `docs/design-critique-2026-08-06.md` → `archive/design/design-critique-2026-08-06.md`
  - `docs/navy-cover-design-revision-plan.md` → `archive/design/navy-cover-design-revision-plan.md`
  - `docs/stripe-design-revision-plan.md` → `archive/design/stripe-design-revision-plan.md`
  - `docs/stripe-landing-design-study-2026-08-07.md` → `archive/design/stripe-landing-design-study-2026-08-07.md`
  - `docs/DENTAL_CLINIC_PROMPT_GENERATION_CONTEXT.md` → `archive/prompt-contexts/DENTAL_CLINIC_PROMPT_GENERATION_CONTEXT.md`
  - `experiments/` → `archive/experiments/` (15 files, 288 KB)
  - `report-prototype/` → `archive/prototypes/report-prototype/` (40,393 files, 394,760 KB; includes untracked `redesign/` work)
  - `scripts/build_translation_sheet.py` → `archive/tools/build_translation_sheet.py`
  - `gtm/` → `archive/legacy-empty/gtm/`
- **Active files edited:**
  - `archive/README.md` (created; archive index)
  - `README.md` (removed "Current offer validation experiment" row; routed `EXP-001`/`experiments/` references to `archive/experiments/`)
  - `docs/INDEX.md` (archive pointer → `../archive/`; no-canonical-DESIGN statement; archived experiments/design/report-prototype pointers)
  - `AGENTS.md` (added rule 14: do not read or use `archive/` unless a task names a specific archived path)
  - `docs/DECISION_LOG.md` (only the archived-vision path in the 2026-08-09 vision-adoption row: `docs/archive/…` → `archive/visions/…`)
  - `tsconfig.json` (exclude `report-prototype` → `archive`)
  - `eslint.config.mjs` (`archive/**` added to `globalIgnores`; then Prettier-formatted)
- **Validations run (all passed):**
  - Markdown link validation across 18 active `.md` files, excluding `archive/`
  - `git diff --check` → exit 0
  - `npm run check` → exit 0 (typecheck + lint + format:check; two pre-existing `<img>` lint warnings in `src/` remain, unrelated to this cleanup)
  - Pre/post file counts and sizes verified for `experiments/` (15 files / 288 KB) and `report-prototype/` (40,393 files / 394,760 KB)
  - All four `report-prototype/redesign/` files confirmed present under `archive/prototypes/report-prototype/redesign/`
  - `git status --short --untracked-files=all` reviewed
- **Exceptions:** None. Empty source directories (`docs/archive/`, `docs/reviews/`, `scripts/`) were removed with `rmdir` after their contents moved — no file was deleted.
