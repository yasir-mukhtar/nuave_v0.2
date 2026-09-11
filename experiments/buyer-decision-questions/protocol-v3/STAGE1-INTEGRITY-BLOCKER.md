# Stage 1 integrity blocker — protocol-v3

Stage 1 completed 24 provider calls and preserved all 16 pack records and raw responses. However, the P runner used the final output schema for the planner call. The planner instruction requested an intermediate intent plan, but the enforced schema required final question objects, so each recorded `raw_plan` contains question-shaped output (`text`, `intended_measurement`, `identity_mode`, `comparison_mode`, `evidence_refs`) rather than the frozen plan contract's explicit `decision`, `scope_needed`, and `comparison_target` fields.

The final P realizer calls did receive those planner outputs and returned mechanically valid final packs. Nevertheless, the intended planner→realizer treatment was not faithfully implemented: the planner already generated question text and was not independently validated as a plan. The 24 calls and all raw evidence remain preserved; no retry, replacement, or additional generation was performed.

**Disposition:** do not use the Stage 1 review bundle for an architecture decision or founder acceptance review. The static page remains available only for technical inspection, not as a trustworthy blind comparison. Repair the runner with a dedicated frozen planner schema and obtain explicit authorization before any new generation; do not modify this protocol or relabel these records as valid P evidence.
