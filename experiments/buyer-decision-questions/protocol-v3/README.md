# Buyer-question experiment protocol v3

Status: **offline preparation only; not approved for live calls**

This additive package tests a corrected one-shot baseline (S) against intent planning followed by language realization (P). It preserves B v2 and all historical records. No production path, provider runner, or measurement matrix is changed here.

## Frozen decision
Does planning improve reliable, natural customer questions enough to justify its added call and schema complexity while preserving intended measurements?

## Arms
- **S:** one call receives the same frozen facts, Indonesian voice guidance, ten-request contract, and output schema.
- **P:** one planner call records supported intents, identity mode, answerability scope, evidence references, and intended measurement; one realization call turns that plan into the same final ten-request contract. The planner is regenerated for every repeat.

Both use Luna, low reasoning, no search, fresh contexts, no retries, ranking, repair, or best-run selection. Failed attempts remain in the denominator.

## Staged run
- Screen: 8 fixtures × 2 arms × 1 repeat = 16 packs and 24 provider calls (8 S + 16 P).
- Continue only after screen review clears the registered promising criteria: 16/16 packs pass language and semantic checks, no recurring critical P defect, and P is preferred in at least 5/8 fixture pairs across at least 3 categories.
- Confirmation: two additional repeats per fixture and arm = 32 packs and 48 calls.

Calls require separate founder authorization. This document does not authorize them.

## Required output
Preserve raw plans, realized text, schemas, settings, call counts, failures, review coverage, and provenance. Never silently select or repair an output.
