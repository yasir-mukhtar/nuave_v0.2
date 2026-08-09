# Nuave agent instructions

## Default mode: build the pipeline

Start with [`README.md`](./README.md) and [`docs/NOW.md`](./docs/NOW.md). Load
only the product, audit, experiment, or GTM document needed for the task. Do not
load all historical planning by default.

The current deliverable is one working path from intake form to downloadable
report, per Phase 1 in [`docs/VISION.md`](./docs/VISION.md). Optimize for that
path working end to end. Prefer the smallest thing that removes a manual step
from it over a generalized system that serves a hypothetical one.

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

Material product decisions belong in `docs/DECISION_LOG.md`. Current status
and the next action belong in `docs/NOW.md`. Update them only when the work
actually changes those facts.

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
