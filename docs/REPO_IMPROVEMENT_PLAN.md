# Nuave repository improvement plan

> Created: 2026-07-30
> Status: proposed execution plan
> Goal: make the repository lean, current, and reliable as both a codebase and
> a source of context for future AI sessions.

## Outcome

After this plan is complete, a new contributor or AI session should be able to
understand Nuave by reading:

1. `README.md`;
2. `docs/NOW.md`; and
3. no more than one task-specific document.

Those files must make the current product, evidence, objective, next action,
and applicable working rules unambiguous. Historical plans must not compete
with current instructions.

This is a raw-MVP cleanup. It must improve the current landing page and manual
audit workflow without designing a future platform.

## Guardrails

- Preserve real experiment evidence and dated decisions.
- Preserve unrelated founder changes.
- Do not treat old plans as observed customer evidence.
- Do not delete a document until its unique, still-relevant content has a
  named destination.
- Keep private contact information, credentials, and patient data outside the
  repository.
- Complete and review one step at a time. Do not perform the cleanup as one
  broad rewrite.

## Step 1 — Freeze the current baseline

### Objective

Create a reviewable record of what exists before consolidation so useful
context cannot disappear silently.

### Changes

- List every tracked document with its purpose, last meaningful update, and
  one of four statuses:
  - `CURRENT`: governs work now;
  - `EVIDENCE`: records an observation or completed experiment;
  - `REFERENCE`: contains unique material that may be needed later;
  - `REDUNDANT`: overlaps a named current destination.
- For each `REFERENCE` or `REDUNDANT` document, name the exact current file
  that will receive any useful content.
- Record all incoming links to files proposed for removal or relocation.
- Record the current build result before changing application code.

The inventory is a temporary working note for this cleanup. Remove it when the
final link and context checks pass; do not create a permanent tracker.

### Validation

- Every tracked Markdown file has one status and, where applicable, one
  destination.
- No file is marked redundant solely because it is long or old.
- `npm run build` completes, or the existing failure is recorded before edits.

### Complete when

The founder can review one compact inventory and see what will be kept,
merged, or removed before any destructive change occurs.

## Step 2 — Establish one authority chain

### Objective

Remove uncertainty about which document wins when files disagree.

### Changes

- Keep `README.md` as the only repository entry point and routing page.
- Keep `AGENTS.md` as the working rules for AI and human contributors.
- Keep `CLAUDE.md` as a short compatibility pointer to `AGENTS.md`; do not
  duplicate operating rules there.
- Make the active authority chain:
  1. the latest dated decision in `docs/DECISION_LOG.md`;
  2. `docs/NOW.md` for current objective, facts, unknowns, and next action;
  3. `docs/PRODUCT.md` for the current customer, offer, promise, and scope;
  4. the relevant audit, experiment, or GTM document for task detail.
- Move `docs/v2/DECISION_LOG.md` to `docs/DECISION_LOG.md` and update every
  reference to it.
- Remove other claims that a directory or specialist document is the
  repository-wide “source of truth.”
- Add a short status header to every retained operating document containing
  its status and last meaningful update date.

### Validation

- Searching for `canonical`, `source of truth`, `governing`, `current`, and
  `active` finds no competing authority claims.
- All references to the decision log use its new path.
- A reader can identify the authority order from `README.md` without opening
  `docs/v2/`.

### Complete when

There is one documented answer to “which file should I trust?” for every
current task.

## Step 3 — Consolidate current documentation

### Objective

Reduce overlapping documents while preserving decisions, evidence, and the
minimum instructions needed to deliver the current product.

### Changes

Use the following destination map:

| Existing material | Current destination |
|---|---|
| `docs/v2/FOUNDATION.md` and current parts of `MVP_SPEC.md` | `docs/PRODUCT.md` |
| Current manual measurement and report rules in `MEASUREMENT_SPEC.md`, `OPERATIONS_RUNBOOK.md`, and `AI-VISIBILITY-REPORT-CONTEXT.md` | `docs/AUDIT.md` |
| Prompt taxonomy and question-writing rules | `docs/PROMPT_GENERATION_CONTEXT.md` |
| Current claims, privacy, and data-minimization rules from `COMPLIANCE_AND_DATA.md` | `AGENTS.md`, `docs/PRODUCT.md`, or `docs/AUDIT.md`, according to where the rule applies |
| Current experiment rules and gates | a short `experiments/README.md` |
| Current commercial rules from the CMO and funnel documents | `gtm/README.md` and `gtm/NOW.md` |
| Dated founder-approved decisions | `docs/DECISION_LOG.md` |

After the relevant content is merged and checked:

- Remove the remaining `docs/v2` planning documents.
- Remove future-system specifications for subscriptions, automation,
  dashboards, complex lifecycle states, and scaled acquisition unless a dated
  decision still requires them now.
- Keep completed experiment records under `experiments/runs/` unchanged except
  for repaired links.
- Replace the completed `experiments/ACTIVE.md` with
  `experiments/README.md`. The new index must link to completed runs and state
  that the active objective lives in `docs/NOW.md`.
- Keep the frozen `experiments/EXP-001/` package clearly labelled as deferred
  reference, not current work.
- Reduce `artifacts/README.md` to the artifacts that actually exist. Remove its
  large planned directory tree and merge or remove the unused artifact
  workflow/status documents.
- Keep the prospect-conversation template because it supports the next
  customer-learning action. Remove empty scorecards, weekly-review machinery,
  or future GTM structures that have no real activity behind them.

### Validation

- Compare each removed file with its destination and confirm that unique
  current rules, evidence links, and dated decisions remain.
- Run a local Markdown-link check across all tracked documents.
- Search for the old product, old decision-log path, removed document names,
  Gemini as a current prompt-pack requirement, and completed work described as
  active.
- Confirm experiment evidence and limitations are unchanged.

### Complete when

The current document set is materially smaller, all retained documents have a
distinct purpose, and no historical plan can silently govern current work.

## Step 4 — Align the landing page with the current product

### Objective

Make the code present the same product described by the current documents.

### Changes

- Freeze the approved landing-page message in `docs/PRODUCT.md` before editing
  translated copy.
- Update Indonesian and English copy together so both describe:
  - one paid AI visibility audit for a single dental-clinic location;
  - the Rp149,000 founding offer;
  - evidence from stated questions, dates, and execution surfaces;
  - findings and recommended actions without rankings, guarantees, or claims
    of clinical quality.
- Remove or rewrite free-audit, subscription, continuous-monitoring,
  dashboard, and unsupported composite-score messaging.
- Keep the existing visual baseline unless a visual element directly
  contradicts the current product.
- Trace each claim shown in a report preview to the current audit method or
  clearly label it as illustrative.

### Validation

- Review every user-visible claim in both languages against `docs/PRODUCT.md`
  and `docs/AUDIT.md`.
- Confirm prices, scope, limitations, and calls to action match in both
  languages.
- Run the application build and inspect the landing page on mobile and desktop
  widths.
- Confirm that no patient data or unsupported clinic result appears in sample
  content.

### Complete when

A founder can show the landing page and current product documents together
without explaining contradictions between them.

## Step 5 — Make the code easier to review

### Objective

Reduce the risk of broad AI-generated edits without adding speculative
architecture.

### Changes

- Split `src/app/page.tsx` into customer-facing landing sections under
  `src/components/landing/`; keep page assembly in `page.tsx`.
- Split landing-specific styles out of the large global stylesheet. Keep
  global resets and shared tokens global, and colocate or group section styles
  by their landing-page purpose.
- Organize both translation files with matching namespaces for navigation,
  hero, problem, method, report preview, FAQ, call to action, and footer.
- Remove components and dependencies only after confirming they are unused
  following the product-copy update.
- Add package commands for:
  - `typecheck`: TypeScript checking without output;
  - `lint`: static code checks;
  - `format:check`: formatting verification;
  - `check`: the combined non-mutating local verification.
- Add only the minimum linting and formatting dependencies required by those
  commands. Do not add a testing framework until important behavior exists
  that cannot be covered by type, build, or manual interaction checks.

### Validation

- `npm run check` and `npm run build` pass.
- Indonesian and English translation namespaces have matching keys.
- The rendered page retains required behavior, navigation, language switching,
  and responsive layout.
- No active source file is moved merely to make the tree appear more complex.

### Complete when

The landing page can be changed section by section, and contributors have one
command that catches common mistakes before review.

## Step 6 — Test the AI handoff

### Objective

Verify that the repository itself provides enough current context without
relying on chat history.

### Changes

Start a fresh AI session with only this instruction:

> Read the minimum repository context needed. State Nuave's current product,
> customer, price, stage, current objective, next action, known customer
> evidence, major non-goals, and the document that governs your next task. Do
> not make changes.

The expected response must identify:

- a one-time AI visibility audit;
- one single-location dental clinic as the initial customer;
- the Rp149,000 founding offer;
- the pre-customer raw-MVP stage;
- the exact objective and next action from `docs/NOW.md`;
- zero paying v2 customers;
- the difference between observed evidence and unvalidated beliefs;
- dashboards, subscriptions, automation, and scaling as out of scope;
- no more than one additional task-specific governing document.

Revise routing or conflicting language if the fresh session gives an incorrect
or ambiguous answer. Do not add a new context framework to compensate.

### Validation

- Run the fresh-session test twice.
- Both sessions answer the expected points from repository files and do not
  promote historical plans to current policy.
- Both sessions load `README.md`, `docs/NOW.md`, and at most one specialist
  document before answering.

### Complete when

Two fresh AI sessions independently identify the same current product,
evidence boundary, objective, and next action.

## Execution sequence

Implement this plan as four reviewable batches:

1. **Authority cleanup:** Steps 1 and 2.
2. **Documentation consolidation:** Step 3.
3. **Product alignment:** Step 4.
4. **Code and handoff quality:** Steps 5 and 6.

For each batch:

- state the bounded deliverable and files in scope before editing;
- preserve unrelated changes;
- run the batch-specific validation;
- update `docs/NOW.md` only if the current objective or next action actually
  changes;
- add a decision-log entry only for a material product decision;
- list files changed and the next smallest action at handoff; and
- use a separate commit so the batch can be reviewed or reverted independently.

## Final acceptance criteria

The cleanup is complete only when:

- the authority chain is singular and all internal links work;
- retained documents have distinct, current purposes;
- unique evidence and dated decisions remain accessible;
- the landing page and product documents describe the same offer;
- automated code checks and the application build pass; and
- two fresh AI sessions pass the handoff test without using chat history.
