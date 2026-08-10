# Nuave document and specification workflow

> Status: **Canonical working method**
> Updated: 2026-08-09

This workflow keeps product reasoning consistent across fresh AI sessions
without asking every agent to ingest the entire repository.

## Roles

### Founder

The founder approves material product, commercial, privacy, publishing, and
customer-experience decisions. The founder supplies context that cannot be
discovered from the repository and chooses between genuine strategic options.

### Orchestrator

The orchestrator protects the authority chain, decides what context a task
needs, writes high-leverage product documents and specifications, creates
bounded worker prompts, reviews results, and identifies decisions that require
the founder.

The orchestrator does not delegate an unresolved strategic choice as if it
were a writing task.

### Worker

The worker performs a bounded drafting, inventory, implementation, test, or
verification task from an explicit prompt. The worker may make reversible
implementation judgments inside that scope. It must not change the customer,
promise, product boundary, evidence standard, or commercial direction.

When instructions conflict or a product decision is missing, the worker stops
and reports the conflict instead of silently choosing.

### Reviewer

A reviewer approaches the artifact or implementation from a fresh context. It
checks the approved intent, evidence, contradictions, omissions, and acceptance
criteria. Reviewing is separate from defending the original work.

## Context rules

1. Begin with `AGENTS.md` and the task brief or approved specification.
2. Read only the canonical sources named under **Required context**.
3. Read referenced sections in full. Do not rely on extracted sentences when
   surrounding qualifications affect their meaning.
4. Do not load historical experiments, superseded plans, or earlier drafts
   unless the task explicitly requires comparison or historical evidence.
5. Never ask an agent to "read the whole repository." Name relevant paths and
   explain why each one matters.
6. A task may cite specific code directories for discovery while excluding
   unrelated product documents.
7. Freshness is useful only when authority is clear. Independent agents should
   receive the same settled facts, not different versions of product truth.

## Creating a canonical document

### 1. Brief

The orchestrator creates a brief from [`briefs/TEMPLATE.md`](./briefs/TEMPLATE.md).
The brief defines the document's decision level, required context, settled
decisions, open questions, exclusions, and quality bar. It should constrain the
problem without prescribing the prose.

### 2. Independent draft

Use a fresh session. The drafting agent reads the brief and only its required
context. It does not read prior drafts of the same artifact unless comparison
is the task. The candidate is written to a clearly named draft path and no
canonical file is replaced.

### 3. Independent review

Use a fresh session or the orchestrator. The reviewer reads the same brief and
context plus the candidate. It checks:

- alignment with parent documents and settled decisions;
- unsupported claims or hidden assumptions;
- missing implications for the intended audience;
- tactical detail that belongs in a lower-level document;
- ambiguity likely to produce inconsistent downstream work;
- duplication or conflicting ownership between documents; and
- whether the artifact can guide an actual decision.

The reviewer reports findings before rewriting. Material alternatives return
to the founder.

### 4. Revision and approval

The orchestrator incorporates approved decisions and resolves review findings.
The founder approves a document that changes product direction. Approval is
explicit; a polished draft is not automatically canonical.

### 5. Promotion

When approved:

- preserve or archive the former canonical version when comparison remains
  useful;
- promote the candidate to the canonical path;
- update [`INDEX.md`](./INDEX.md) and repository routing;
- record material decisions in [`DECISION_LOG.md`](./DECISION_LOG.md);
- repair direct contradictions in affected child documents; and
- update [`NOW.md`](./NOW.md) only when the current facts or next action changed.

Drafts and reviews are working material. Keep only artifacts that retain useful
decision evidence; Git already preserves ordinary revision history.

## Specification-driven development

One approved specification covers one bounded, reviewable user outcome. Follow
the lifecycle in [`../specs/README.md`](../specs/README.md).

### Specification gate

Implementation begins only when:

- the user outcome, scope, and non-scope are clear;
- customer-visible states and failure behavior are defined;
- evidence, privacy, cost, and permission constraints are stated where
  relevant;
- acceptance criteria are observable or testable;
- material product decisions are resolved; and
- the specification is marked **Approved**.

Technical exploration may precede approval when the spec names it as a spike,
but exploratory code is not silently treated as the final implementation.

### Implementation

The implementation agent receives a bounded worker prompt and reads the
approved spec before touching code. It should:

1. inspect only the relevant implementation and tests;
2. state the bounded files it expects to touch;
3. implement the smallest complete path through the acceptance criteria;
4. add or update proportionate tests;
5. run the relevant checks; and
6. report deviations, remaining risk, and changed files.

If implementation reveals a missing product decision, stop that branch of work
and return it to the orchestrator. Do not change the spec to rationalize the
code after the fact.

### Independent verification

A fresh reviewer uses [`templates/VERIFICATION.md`](./templates/VERIFICATION.md)
to compare the implementation with every acceptance criterion. Verification
includes relevant automated checks and judgment-based review where required.

A specification becomes **Verified** only when all required criteria pass or
the founder explicitly accepts a documented exception. Failed verification
returns a bounded fix list to implementation.

### Closeout

After verification:

- record evidence in the spec package;
- mark the spec **Verified**;
- update `NOW.md` with the next smallest outcome;
- update canonical documents only when product truth changed; and
- do not commit or push unless the founder explicitly requests it.

## Worker handoff standard

Every worker prompt must state:

- repository path;
- role and single objective;
- exact required context in reading order;
- files or directories in scope;
- files and decisions out of scope;
- expected deliverable and output path;
- acceptance and validation requirements;
- what must be escalated rather than assumed; and
- the required completion report.

Use [`templates/WORKER_PROMPT.md`](./templates/WORKER_PROMPT.md). The
orchestrator gives the founder a completed prompt only when a task is ready to
delegate. The founder should not need to translate or supplement it.

