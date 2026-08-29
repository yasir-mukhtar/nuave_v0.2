# Nuave agent instructions

## Default mode: build the pipeline

Start with [`README.md`](./README.md) and [`docs/NOW.md`](./docs/NOW.md). Load
only the product, audit, experiment, or GTM document needed for the task. Do not
load all historical planning by default.

The current deliverable is one working path from intake form to downloadable
report, as defined in [`docs/NOW.md`](./docs/NOW.md). Optimize for that path
working end to end. Prefer the smallest thing that removes a manual step from
it over a generalized system that serves a hypothetical one.

[`docs/INDEX.md`](./docs/INDEX.md) is the canonical document map, and
[`docs/WORKFLOW.md`](./docs/WORKFLOW.md) governs fresh-session drafting,
specifications, worker handoffs, and verification. For implementation work,
read the approved specification named by `NOW.md` and only the additional
context it requires. Do not implement a draft specification. If no approved
spec is active, prepare or review the spec before broad implementation.

## Working rules

1. Use plain language and explain unavoidable technical terms.
2. Work on one bounded deliverable that can be reviewed or tested today.
3. Prefer existing tools, manual review, and small samples.
4. Do not add roadmaps, frameworks, schemas, trackers, or architecture unless
   the current deliverable cannot work without them.
5. Do not solve scale, multi-city, multi-vertical, dashboard, or subscription
   problems yet. Automating the intake-to-report path is in scope; automating
   anything around it is not.
6. Use real data. Record the source, query, system or model, and observation
   date when they affect a report claim.
7. Separate observed evidence, Nuave interpretation, and recommended action.
8. Never fabricate customer proof, business facts, AI results, conversion data,
   urgency, causation, rankings, or guarantees.
9. Do not collect medical, legal, financial, or other regulated personal
   records, and do not make claims about the quality of a business's actual
   service.
10. Keep customer contact, payment details, credentials, access tokens, and
    sensitive free text out of model prompts, reports, analytics, and Git.
11. Use only the public business information an audit needs. Label
    buyer-supplied facts, minimize copied source content, and keep raw provider
    responses in restricted evidence storage when they contain unnecessary
    personal information or provider metadata.
12. If sensitive personal data is received, stop processing
    it, restrict access, do not copy it into another tool, and tell the founder.
13. Preserve existing user changes. Do not delete or broadly rewrite files
    merely to make the repository look cleaner.
14. Do not read or use `archive/` unless the task names a specific archived
    path for historical comparison or evidence. Archived material is not
    authoritative or active.

## Engineering guardrails

For implementation work:

1. Start from current `origin/main` and work on a dedicated branch. Never
   implement directly on `main`.
2. Before declaring a branch ready, run `npm run verify`. This is the canonical
   offline verification gate and must not make live provider calls.
3. Do not push known-failing changes merely to use GitHub CI as a debugger.
4. A red required CI check means the implementation is not complete.
5. For bug fixes, reproduce the failure and add or preserve a regression test
   when practical before applying the smallest effective fix.
6. Inspect the complete diff before handoff and remove temporary workflows,
   diagnostic scripts, debug logging, bypasses, and test-only switches that are
   not permanent protections.
7. Do not merge, deploy, or make live provider calls unless the founder
   explicitly authorizes that action.
8. This private repository currently cannot use GitHub branch protection on its
   Free plan. Direct pushes to `main` are therefore prohibited by convention.
   CI must keep the `verify-main-origin` deployment gate: a `main` commit without
   an associated merged pull request must fail that gate and must not deploy.
   This fallback protects production, but it does not prevent the direct push
   from changing the `main` branch itself.

## UI stack and presentation rules

1. Use shadcn for generic UI components.
2. Use Base UI through shadcn for generic behavior and accessibility.
3. Search BeUI before building custom animated, AI, or disclosure UI.
4. Use Tabler for generic interface icons.
5. Do not introduce a second generic UI, primitive, motion, or icon stack.
6. Global visual decisions belong in `src/styles/tokens.css`.
7. Product components compose approved generic primitives.
8. Do not recreate generic primitives that shadcn or Base UI already provides.
9. Default to BeUI's light visual character.
10. Preserve product behavior during presentation refactors.
11. Follow [`docs/DESIGN.md`](./docs/DESIGN.md) for the canonical typography
    families, scale, semantic roles, responsive rules, and report exception.

Material product decisions belong in `docs/DECISION_LOG.md`. Current status
and the next action belong in `docs/NOW.md`. Update them only when the work
actually changes those facts.

A specification may refine a bounded capability but may not silently override
`docs/VISION.md`, `docs/PRODUCT.md`, or the relevant domain guide. Escalate a
conflict or missing product decision to the founder through the orchestrator.

Before editing, briefly state the current objective, bounded deliverable, files
you will touch, and any real blocker. At the end, validate the result, list the
files changed, and name the next smallest useful action.

Internal, reversible drafts and repository work may proceed inside an approved
task. Founder approval is required before contacting anyone, publishing,
spending money, changing a live customer experience, offering a discount or
delivery promise, accepting a non-standard order, using a client name, logo,
quote, or finding publicly, or making a legal, privacy, retention, refund, or
commercial-use commitment.

Do not commit or push unless the founder explicitly requests it.
