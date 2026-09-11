# Nuave Spec 008 — Independent Adversarial Review 5

**Reviewed:** `NUAVE_SPEC_008_IMPLEMENTATION_PLAN_R5.md`  
**Role:** Independent reviewer; no authorship, implementation, adoption, or release action.  
**Verdict:** Proceed to G0–G2P. No architecture-level blocker found. Record the two narrow clarifications below in the existing gates; a broad R6 rewrite is unnecessary.

R5 has a defensible product contract and a bounded way to decide whether its richer generation machinery deserves to exist. Its detail is no longer substituting for the critical experiment: rich generation must beat a credible simpler writer on fresh held-out inputs, within declared costs. Its compatibility and evidence requirements now reach the actual approval/execution boundary.

This is a judgment about the plan. Provider feasibility, question quality, integration correctness, and release readiness remain unproven.

**Evidence scope**

I read the supplied R5 in full and inspected repository sources through the connected GitHub interface. The returned `main` reference was `e531ff4653c324007eb049bee93f2a3b922cf216`, matching R5's inspected baseline. I checked root instructions and routing documents, prompt/brief schemas, the measurement matrix, question validation, the lock helpers, the prompts/run/report/variance routes, the client workflow, and report-pipeline validation.

The returned metadata for [PR #46](https://github.com/yasir-mukhtar/nuave_v0.2/pull/46) described an open intake preview at `afd518dd75d436319c7a5f1c31db9d640e2728d3`. I did not inspect that branch's implementation or verify deployed bundles, runtime configuration, secrets, or provider behavior. G0 must establish the actual implementation handoff. Earlier review documents were not supplied for this review; the assessment below concerns the obligations as written in R5.

R5 SHA-256: `6fa504d8e7e9e8b0985cebbb77556fd51b56c3eca9fc36a7a320ad8dd3338f44`.

**What survives adversarial scrutiny**

| Area | Assessment |
| --- | --- |
| Product objective | Commercial choice, demand for concrete entities, and the correct competitive answer level are separately specified. This addresses the actual weakness of natural but informational questions. |
| Rich versus simple | §§8.1–8.2 test the whole contract before allowing component self-rescue to justify complexity. Held-out ties block rich retention. A failed rich release cannot silently become a passed simple release. |
| Stale prepared clients | §6.2 explicitly refreshes policy before local approval/start blockers and checks revision before paid run effects. Generation is no longer the only way to learn current policy. |
| Direct requests | §5.1 explicitly permits ordinary direct requests and states which legacy behavior remains. This is an actual contract amendment rather than an unresolved grammar instruction. |
| Evidence | §4.3 identifies the pack envelope, root run field, lock result, stream event, and saved history. Browser-carried provenance does not become trusted server evidence. |
| Execution control | Generation remains separate from explicit audit start. Customer edits receive mechanical protections without a new semantic approval service. |
| Sequencing | A minimal prototype precedes the pilot; production plumbing follows the contract-selection decision. Failed gates have bounded next actions. |

The release arithmetic is internally consistent: the rich branch uses 16 selected-writer attempts, 11 v2 attempts, and 5 simple-control attempts; the adopted-simple branch uses 16 plus 16. Neither exceeds 32 primary calls. Pilot calls are a separate maximum of 10.

**F-01 — P2: Specify where correctable fact deficiencies are classified relative to strict request parsing**

**Location:** §§3.1, 4.2 step 1, 6.1; G1/G5.

**Observed repository behavior:** The prompts route parses `{ brief }` with `businessBriefSchema` before invoking generation. That schema requires nonempty `market_context` and at least one entry in offerings, customer needs, and decision criteria. A parse failure enters the route's generic error response. See the [prompts route](https://github.com/yasir-mukhtar/nuave_v0.2/blob/e531ff4653c324007eb049bee93f2a3b922cf216/src/app/api/audit/prompts/route.ts) and [brief schema](https://github.com/yasir-mukhtar/nuave_v0.2/blob/e531ff4653c324007eb049bee93f2a3b922cf216/src/lib/audit/types.ts).

**Failure case:** An implementer adds the two-outcome preflight inside the generator. A capable client's empty offering array or blank locality field fails earlier in the route parser. There are zero provider calls, but the route returns its existing generic failure rather than the promised correction action. Alternatively, an implementer invents placeholder values to make sparse facts pass the old parser.

R5 already requires real parsing fixtures and distinguishes missing optional context from true deficiencies. The remaining ambiguity is the ordering and ownership of that classification.

**Small clarification:** At the capable generation boundary, classify recoverable missing/blank business facts before generic strict-schema rejection, or translate the relevant parse failures into the same bounded correction result. Distinguish genuinely malformed transport from a customer-correctable fact deficiency. The adapter must preserve unknown optional context without synthesizing facts. This does not require relaxing execution's canonical prompt schema.

**Closure in G1/G5:** Exercise the actual route with a correctable deficiency that fails today's schema, a supported sparse input with unknown optional context, and a malformed field type. Verify the intended error/action, preserved facts, and provider-call count. Continue through the existing edit destination and successful regeneration for the correctable case.

**Severity rationale:** A recovery integration gap, not a reason to redesign generation or postpone baseline/pilot preparation.

**F-02 — P2: Make the policy migration cover the existing helper call graph and duplicate validators**

**Location:** §§4.3, 5, 6.2–6.3; G3/G4/G5.

**Observed repository behavior:** The canonical lock is currently a synchronous, shared structural/canonicalization helper. It is called indirectly by observation-binding checks, completed-run proof, and variance designation. Some of those helpers run in the browser. The report pipeline also invokes `validateCanonicalIndonesianQuestionPack` independently of locking. See the [lock helpers](https://github.com/yasir-mukhtar/nuave_v0.2/blob/e531ff4653c324007eb049bee93f2a3b922cf216/src/lib/audit/locked-question-pack.ts), [client workflow](https://github.com/yasir-mukhtar/nuave_v0.2/blob/e531ff4653c324007eb049bee93f2a3b922cf216/src/app/audit/AuditWorkflow.tsx), and [report pipeline](https://github.com/yasir-mukhtar/nuave_v0.2/blob/e531ff4653c324007eb049bee93f2a3b922cf216/src/lib/audit/report-pipeline.ts).

**Failure case:** An ordinary-punctuation v3 request passes the new run-route policy. A later report validation or nested helper still uses the legacy question-mark rule or a legacy default. The audit observations succeed, but report completion or variance recovery fails. Moving a server-only resolver into the shared lock to avoid this can instead break browser consumers.

The [variance route](https://github.com/yasir-mukhtar/nuave_v0.2/blob/e531ff4653c324007eb049bee93f2a3b922cf216/src/app/api/audit/variance/route.ts) is also an independent paid observation path. Merely forwarding diagnostics to it does not establish that its admission checks use the intended server policy.

R5 already instructs G3 to inventory consumers and G4–G5 to prove downstream compatibility. Those requirements are sufficient in principle. This is a concrete implementation trap to name in that inventory, rather than another demand for a new policy architecture.

**Small clarification:** Preserve pure, browser-safe canonicalization and binding operations. Where admission validation is required, propagate the explicit validation context through nested callers and migrate standalone validator calls too. Server entry points resolve their own applicable policy; browser-carried evidence never selects it. Inspecting stored evidence must remain distinct from authorizing another provider call. This can be implemented with the existing modules.

**Closure in G3–G5:** Trace one ordinary-punctuation pack through start, resume, report validation, saved-state restoration, and variance, including writer rollback. Verify the exact text, the applied policy at each execution boundary, and evidence preservation. Include the report pipeline's independent validator in the trace. No nested legacy default should reject text accepted by the applicable compatible policy.

**Severity rationale:** A cross-module migration risk within already-required work. It does not invalidate R5's policy-delivery design.

**What I would not reopen**

- The six/four slot composition and report classes are explicit product boundaries. This review supplies no new evidence for changing them. Calculation invariance should not be described as proof that scores from different question-generation methods are empirically interchangeable.
- Reserves, coverage selection, and returned market/decision metadata remain hypotheses. Their existence in the prototype does not authorize retaining them when the declared comparisons fail.
- Four held-out businesses and sixteen selected-writer attempts are small samples. R5 explicitly limits what they establish; requiring statistical certification here would change the scope.
- The absence of a runtime semantic reviewer is deliberate. Mechanical checks cannot certify every future question, and R5's evidence model acknowledges that limitation.
- Provider settings and the approved intake handoff belong to G0. I would not invent them from old repository documentation or treat an unverified deployment assumption as a confirmed incompatibility.

The plan is still long, but most remaining length specifies distinct failure behavior. The revision history and acceptance crosswalk could be shortened later. Editing those sections again would not establish writer quality.

**Recommended disposition**

Adopt R5 through its stated workflow, attach F-01 to G1 and F-02 to G3, and begin the bounded feasibility work. Keep G2P and G6 genuinely blocking. Reopen architecture only if repository inspection or the frozen experiment produces a concrete failure that the current contract cannot accommodate.

No repository files were changed, and no implementation, provider experiment, commit, push, or deployment was performed.

