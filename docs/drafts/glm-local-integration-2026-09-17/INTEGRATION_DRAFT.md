# GLM-5.3 Flash local integration — offline draft

> Status: **revision 3, 2026-09-17 — direction accepted by the second review;
> this revision closes its three narrow contract corrections (C1–C3).** Still
> not approved; not implementation or live-call authorization.
> Nothing here is implemented. This document authorizes no code change,
> provider call, or deployment. It accompanies
> [`REQUEST_SPECIMEN.json`](./REQUEST_SPECIMEN.json), an unsent adapted request
> whose embedded context is reproducible from a recorded fictional adapter
> input (§14).
>
> Evidence basis: the preserved winning instruction
> [`WINNING_QUESTION_GENERATION_PROMPT_2026-09-07.md`](../../references/WINNING_QUESTION_GENERATION_PROMPT_2026-09-07.md),
> checkpoint [`NUAVE-PROMPTS-2026-09-17`](../../checkpoints/2026-09-17-winning-prompt-glm/CHECKPOINT.md)
> with its [frozen request](../../checkpoints/2026-09-17-winning-prompt-glm/request.json),
> [fictional input](../../checkpoints/2026-09-17-winning-prompt-glm/business-input.json),
> and [captured questions + founder edits](../../checkpoints/2026-09-17-winning-prompt-glm/CAPTURED_QUESTIONS.md);
> Spec 008 [`SPEC.md`](../../../specs/008-recommendation-eligible-question-generation/SPEC.md)
> and [`NUAVE_SPEC_008_IMPLEMENTATION_PLAN_R5.md`](../../../specs/008-recommendation-eligible-question-generation/NUAVE_SPEC_008_IMPLEMENTATION_PLAN_R5.md);
> `docs/journey/04-questions.md`; and the actual code paths cited below.

## 1. The recommended slice in one paragraph

**Build a dormant adapter/prototype for the adopted prompt contract — offline
checks only, no live caller — and defer all customer-route, history, and
execution integration.** Concretely: one pure request builder
(`buildCheaperInferenceIndonesianQuestionRequest`), one bounded response
extractor (`extractIndonesianSlotQuestions` — pulls the ten numbered lines out
of the response's `## 2. Slot questions` section only), and one GLM-scoped
validation variant (`validateIndonesianQuestionPackV3`, §8) that applies the
already-approved R5 §§5.1–5.2 forms the legacy validator rejects. All are pure
functions exercised by offline tests against the specimen and synthetic
responses; none is registered, routed, or reachable. A single send of the
adapted request — separately authorized, runner-style, non-production —
produces contract evidence for exact-text review. That send is evidence, not a
pilot pass and not integration.

Revision-1's claim that the slice could plug into the live route with
"everything downstream reused unchanged" was wrong in two ways the review's
probes demonstrated: the unchanged validator would replace founder-accepted
wording with fallback text (R1), and the edit/approval helpers it relied on
are not actually wired into the current flow (R3). Both are corrected below.

Dormant slice (offline only):

```
fictional/confirmed brief → parseQuestionFactsV3 → buildV3WriterContext
  → adapted winning instruction + projected context (one user message)
  → buildCheaperInferenceIndonesianQuestionRequest  [pure, test-asserted]
  ———— live send only under separate authorization ————
  → parseCheaperInferenceIndonesianResponse (chat-completions → text)
  → extractIndonesianSlotQuestions  [strict: '## 2. Slot questions' span,
    numbered items 1–10 in order, no text silently dropped — §4a]
  → validateIndonesianQuestionPackV3  [GLM-only rules, §8]
  → any failure = explicit parse/validation failure with the original
    response preserved for review — NO replacement question generation,
    no PromptPack, no telemetry in this slice (§9)
```

Deferred to a later, separately gated slice (boundaries named in §4b):
route schema additions, provider registration, `AuditWorkflow` wiring,
edit/approval plumbing into the real saved pack, `self_check` truthfulness,
customer dispatch.

## 2. What is established evidence and what is not

| Claim | Status |
| --- | --- |
| Endpoint reachable; request shape accepted; plain-text output returned | Established once: authorized connection check 2026-09-17, HTTP 200, `finish_reason: "stop"`, 53.3 s |
| Returned model identifier is `zai/glm-5.3-flash` when `glm-5.3-flash` was requested | Established once (same capture); **alias acceptance is an open decision, not a fact to code around silently** |
| Billed cost path `cheaper_inference.billing.billed_cost_usd` | Established once: USD 0.000371 settled; usage 2,684 + 1,164 tokens |
| Provider-side timing can exceed 60 s | Established: first attempt timed out client-side at 60 s while the provider settled upstream in ~66.7 s (founder-supplied usage screenshots, request `e5a43236-…`) |
| The winning instruction produces founder-acceptable Indonesian | Partially: "Mostly—some questions need edits" with two exact replacements; not an approval of all twelve |
| The **adapted** instruction produces good **ten-slot** output | **Untested** — no adapted request has ever been sent |
| Twelve captured questions are a usable product pack | **No.** They are twelve unnamed candidates from an experiment contract; the product needs six unnamed + four named slot-bound questions. See §6 |
| The 2026-09-17 capture is a G2P pilot pass | **No.** Two connection samples on the experimental twelve-candidate contract. The *original* G2P pilot ran and returned `not_retained` — preserved as history; the *adapted* GLM pilot has never run |
| GLM can serve the production path today | **No.** Provider unregistered on `main`, production lock is `opencodego`, alias decision pending, 180 s support unverified on the deployed route |

## 3. The actual confirmed-input and review path today

The path the slice plugs into, verified against `main` (this checkout is
`codex/prompt-generation-checkpoint-2026-09-17` @ `6c9553f`, with `origin/main`
identical for every file cited):

1. `AuditWorkflow.generatePrompts()` POSTs `{ brief }` — the customer-confirmed
   `BusinessBrief` — to `/api/audit/prompts`
   (`src/app/audit/AuditWorkflow.tsx:1005-1037`). The signal it passes is a
   staleness guard (`AuditOperationGeneration`), not a time limit.
2. `route.ts` (Node.js runtime) validates `businessBriefSchema`, runs
   `assertSafeComparisonBusinessUrls`, calls
   `buildLiveIndonesianPromptPack({ brief })`
   (`src/app/api/audit/prompts/route.ts:13-31`).
3. `buildLiveIndonesianPromptPack`
   (`src/lib/audit/questions-id-live.ts:135-382`):
   - `liveIndonesianQuestionProviderName()` fails closed to `opencodego`;
     other providers need `NUAVE_LIVE_PROVIDER_TESTING=1` **and**
     non-production (`questions-id-provider.ts:194-208`).
   - `minimizeIndonesianBrief(brief)` produces `MinimizedIndonesianBrief`
     (`questions-id.ts:99-161`) — the current, lossy writer input.
   - One provider call through `generateIndonesianQuestionPack`
     (`questions-id.ts:1116+`): `structured` ten-strings → `source:"model"`;
     `text` → `parseNumberedIndonesianQuestions` → `source:"parsed"`;
     any throw → `source:"fallback"`.
   - A wrapping `capturingFetch` records URL/status/body for telemetry
     (usage, returned model, response id).
   - `protectedQuestionGenerationProvenanceError`
     (`questions-id-live.ts:83-100`) enforces returned-model equality and
     response id **only for `opencodego`** today; other providers are
     silently unprovenanced.
   - Any provenance error, canonical blocker, validation issue, or guard
     issue substitutes the **whole pack** with the deterministic fallback,
     pushes `fallback_used` into `pack.warnings`, and marks the prompts
     telemetry `failed`.
   - Cost telemetry is `accountedCostUsd` — OpenCode Go list-rate
     arithmetic (`0.2/1.2` USD/Mtok), recorded as `cost_basis:
     "provider_usage"` though it is an estimate from usage, not a billed
     amount.
4. `QuestionReviewScreen.tsx` renders the ten questions grouped
   `Tanpa menyebut bisnis Anda` / `Menyebut bisnis Anda`; `Ubah` opens one
   card; save runs `introducedQuestionEditIssues`
   (`src/app/audit/intake/questionEditTransaction.ts:28-36`), which calls the
   **same** `validateCanonicalIndonesianQuestionPack` — newly introduced
   issues are refused at the card. `onEdit` → `editPrompt`
   (`AuditWorkflow.tsx:1039-1060`) rewrites that slot's `prompt.question`
   **directly** — it does not call `applyIndonesianQuestionEdits` or
   `approveIndonesianQuestionPack`. Nothing starts the audit until
   `Jalankan audit` → `onRun`.
5. `applyIndonesianQuestionEdits` and `approveIndonesianQuestionPack`
   (`questions-id.ts:1220`, `:1341`) exist and own the richer edit-history /
   approval record — but they have **no caller outside `questions-id.ts` and
   tests** today (verified by grep). The current flow saves edits by mutating
   `prompt.question`; whether their `{order, from, to, edited_at}` record
   reaches the persisted/replayed pack is **unproven, not established**.
   Any GLM integration must either wire them in honestly or state that edit
   history is limited to what the current flow actually persists.
6. The route today accepts only `{ brief }` and returns a generic 400 on
   failure — there is no `INPUT_CORRECTION_REQUIRED` response or UI path, so
   a facts-projection correction cannot yet reach the customer as a
   correction. And `buildLiveIndonesianPromptPack` stamps `self_check`
   (`questions-id-live.ts:353-363`) with blanket claims —
   `verified_inputs_only: true`, `independent_natural_questions: true` —
   that R5 §4.3 requires omitting for the v3 path. Both are deferred-boundary
   items in §4b, not solved by this slice.

Dormant-but-merged G1 layer (no live caller yet):
`parseQuestionFactsV3` (`question-facts-v3.ts:227`) accepts
`{requestId, brief, factsRevision, factsContext?}` or the local-intake freeze
`{requestId, intake, factsContext?}` and returns `projected` /
`INPUT_CORRECTION_REQUIRED` / `INVALID_REQUEST`. `buildV3WriterContext`
(`question-context-v3.ts:218`) emits ten per-slot projections from
`V3_CONTEXT_MAP` — the matrix `allowedContextFields` plus the R5 §3.2 shared
layer (`entityScope`, `marketContext`, `serviceChannels`, `accessConstraints`)
plus `customerNeeds` for `need_fit`. Unnamed slots get `identity: null`, a
kind-only `entityScope`, and `comparison: null`; forbidden identities are
stripped from every projected value; `official_sources`,
`known_accuracy_questions`, and `conversion_action` have no writer mapping.

The new intake's `src/lib/intake/local-questions.ts` is a deterministic local
preview — zero provider calls, no audit execution — and stays that way.

## 4. Exact affected functions/files

### 4a. The dormant slice (offline only — no live caller, no route)

New pure functions plus tests. Nothing below is registered, exported to a
route, or reachable at runtime; the only sanctioned live use is a
separately authorized runner-style send for contract evidence (§12).

**New file `src/lib/audit/questions-id-glm.ts`** (or a clearly named sibling
— placement is a routine choice):

- `INDONESIAN_QUESTION_WRITER_INSTRUCTION_V3` — the adapted instruction
  in §5, assembled from `AUDIT_MEASUREMENT_MATRIX` the same way
  `writerSlotInstruction` renders the slot contract.
- `buildCheaperInferenceIndonesianQuestionRequest(writerContext)` —
  pure builder asserted exactly in tests: `{model: "glm-5.3-flash",
  stream:false, max_tokens:4096, reasoning_effort:"low",
  messages:[{role:"user", content: instruction + "\n\n" +
  serialized writerContext + amendment}]}` and endpoint
  `https://api.cheaperinference.com/v1/chat/completions`. No `temperature`,
  `top_p`, `response_format`, or tools — the tested request sent none.
- `parseCheaperInferenceIndonesianResponse(body)` — chat-completions body →
  assistant text. Non-2xx, provider `error`, missing/empty content, or
  `finish_reason !== "stop"` are failures, not partial results.
- `extractIndonesianSlotQuestions(text)` — **strict sectioned extractor**;
  it never silently discards response text. Rules:
  1. The three markers `## 1. Market interpretation`,
     `## 2. Slot questions`, `## 3. Self-critique` must each appear exactly
     once, in that order; missing or duplicated markers → `null`.
  2. Inside the `## 2.`→`## 3.` span the only accepted lines are: blank
     lines; numbered question lines `^\s*(\d{1,2})[.)]\s+\S` whose numbers
     must be exactly 1–10 in canonical order; and each question's single
     optional `Intent pattern:` label line immediately after its question.
  3. Any other line inside the span — continuation text under a numbered
     item (e.g. `1. Cariin dong toko laptop yang bagus` / `di
     Bandung/Cimahi.`), prose, stray numbers, duplicate items — is
     **rejected, not dropped**: the whole extraction returns `null`. A
     wrapped question is a malformed item, never a shortened question.
  4. Question text is preserved verbatim apart from trimming surrounding
     whitespace and the number marker itself; no other normalization.
  5. Sections 1 and 3 are never extracted into question texts; critique
     lines stay out of the pack even if they contain `?`.

  This replaces revision-1's reliance on `parseNumberedIndonesianQuestions`
  (which glues trailing prose onto item 10) — and also fixes the first
  strict draft's silent-drop hole, where a wrapped line could pass all ten
  numbers while losing half a question's text.
- `validateIndonesianQuestionPackV3` — the GLM-scoped validation boundary
  specified in §8. Offline tests run it against the review's two probe
  wordings and a mechanically valid baseline.

**Tests** — `questions-id-glm.test.ts` only: exact request-body assertion
(model/params/single message/no credential fields); strict-extractor cases
(well-formed three-section response; missing `## 2.` or `## 3.` marker;
duplicated marker; markers out of order; 8 items; 12 items; out-of-order
numbering; a wrapped/continuation line under an item → `null`, not a
shortened question; stray prose inside section 2 → `null`; `Intent
pattern:` label lines accepted only immediately after their question;
critique text containing question marks never extracted); v3-validator
cases per §8 including the two **complete** founder texts.

### 4b. Deferred boundaries (NOT in this slice — named so nothing is silently assumed)

These are real work in a later, separately gated slice; the dormant
prototype establishes none of them:

- **Route + client:** `route.ts` accepts only `{ brief }` today and returns
  a generic 400. A live path needs optional `requestId`/`factsRevision`
  (required by `parseQuestionFactsV3`), an `INPUT_CORRECTION_REQUIRED`
  response shape that reaches the UI as a correction, and `AuditWorkflow`
  supplying both identifiers — none of which exists yet.
- **Provider registration:** `INDONESIAN_QUESTION_PROVIDER_NAMES`,
  `liveIndonesianQuestionProviderName`, `createIndonesianQuestionProvider`,
  `NUAVE_LIVE_PROVIDER_TESTING` gating, `cheaperInferenceGenerate` transport
  (`CHEAPERINFERENCE_API_KEY`, `AbortSignal.timeout(180_000)`,
  `redirect:"error"`, one client request, zero client retries).
- **Provenance:** extend `protectedQuestionGenerationProvenanceError` for
  `cheaperinference` — missing `returned_model`/`response_id` is an error;
  `returned_model !== requested_model` is an error **until the alias
  decision is recorded**; both identifiers persisted verbatim, never
  normalized.
- **Evidence/truthfulness:** for v3 the `self_check` block
  (`questions-id-live.ts:353-363`) is **omitted entirely — R5 §4.3 already
  requires this**; it is an approved requirement, not an open alternative.
  The corresponding checks/evidence are carried separately and truthfully
  (e.g., real composition/identity results), not as blanket `true` claims.
- **Billing:** extract `cheaper_inference.billing.billed_cost_usd` from the
  captured body; record as billed under `cost_basis: "provider_billed"`
  (concrete recommendation — see §13), with a labeled list-rate estimate
  only when absent.
- **Edit/approval plumbing:** wire `applyIndonesianQuestionEdits`/
  `approveIndonesianQuestionPack` into the real save/approval flow **or**
  document that the GLM flow persists only what the current `editPrompt`
  mutation persists — and make `questionEditTransaction` use the v3
  validation rules for GLM packs (§8) so customer edits aren't judged by
  the legacy `question_form`/superlative rules.
- **Fallback repair truthfulness:** partial substitution must report
  per-text origin (§8); the current `source:"parsed"` +
  `fallback_used:false` on a partially repaired pack is not acceptable for
  the GLM path.
- **Deployed-route 180 s support** — unverified (§11).

**Explicitly untouched everywhere:** `QuestionReviewScreen`,
`questionEditTransaction`'s role for shipped packs, `measurement-matrix.ts`,
`question-facts-v3.ts`, `question-context-v3.ts` (consumed, not modified),
`src/lib/intake/*` (local preview stays provider-free), provider defaults,
deployment configuration, the frozen checkpoint files, and the preserved
GLM branch.

The preserved branch at `2dbd867` (`/Users/yasir/nuave-glm-test`) was used
as a read-only transport reference — its
`buildCheaperInferenceIndonesianQuestionRequest` confirms the chat-completions
shape — but it carries the **old** v2 instruction and flips the production
default, so it is not merged.

## 5. Exact prompt changes from the recovered source

The adapted instruction is quoted in full inside
[`REQUEST_SPECIMEN.json`](./REQUEST_SPECIMEN.json)
(`request.messages[0].content`). Each departure from the recovered
2026-09-07 source, with its reason:

| # | Change | Reason |
| --- | --- | --- |
| C1 | Confirmed input arrives as **structured per-slot JSON** (`buildV3WriterContext` output) instead of a pasted prose "Sample brand" block | The product's input boundary is the confirmed-facts projection, not free text; slot-scoped projection is the existing R5 §3.2 mechanism |
| C2 | "generate **12 candidate** consumer questions" → "write exactly **ten** questions — one for each fixed slot, in order" | The product contract is ten canonical slots, not a candidate pool (§6) |
| C3 | New **Fixed slots** section listing all ten slot contracts (category, purpose, naming rule) rendered from `AUDIT_MEASUREMENT_MATRIX` | The recovered prompt had no slots; the matrix is the authority (R-19). Slots 2/4/6 carry the R-20/21/22 overlay — entity-level help in the situation, entity-seeking for the offering, concrete options compared — an explicitly permitted strengthening of `generatorSlotDescription`, not a purpose change |
| C4 | Naming rule inverted per slot: source forbids the target brand everywhere; here slots 1–6 forbid brand/aliases/comparator while slots 7–10 **require** the brand and slot 9 requires the comparison target with a closed relation marker | Largest substantive departure, forced by fixed matrix semantics; the closed marker set (`atau`, `dibandingkan`, `daripada`, `versus`, `lebih … daripada`, …) admits natural forms like "X atau Y, mending mana…" so no slot-9 wording amendment is needed now |
| C5 | Output format keeps the source's **three sections, bounded by exact markers**: `## 1. Market interpretation`, `## 2. Slot questions` (ten numbered lines 1–10 in slot order, optional `Intent pattern:` label lines), `## 3. Self-critique` | Revision-1 removed the analysis sections as "forced by the parser" — that was wrong: R-30 limits customer questions, not provider-response bytes, and a sectioned extractor can pull ten strings from a richer response. Keeping the sections preserves the winning response mechanism; the bounded extractor (§4a) reads only the `## 2.` span, so critique can never become question 10. This remains a **choice, separately testable** — the pilot can compare it against a flat contract |
| C6 | Market interpretation and self-critique stay in the single response as **provider-side analysis** — extracted to evidence/diagnostics only | They never become customer questions, audit-answer inputs, or persisted pack metadata; they may be retained only alongside the restricted raw-response evidence. Nothing in the customer-facing contract carries them — see §6 |
| C7 | The acceptance test and reject/downrank list are scoped to **unnamed slots (1–6)** | Named slots keep their canonical purposes (R-04); asking "could an AI answer without naming a business" makes no sense where the business must be named |
| C8 | "a **diverse** mix of decision situations" → "a **natural** mix" | The 2026-09-16 amendment supersedes diversity-as-quota; the fused instruction should not carry wording the amendment then has to override |
| C9 | Removed "Questions should differ in substance, not merely wording" | Same reason: in a fused instruction it recreates the distinct-substance quota the founder removed; the amendment is embedded verbatim instead |
| C10 | Founder amendment embedded with two adapted references: "the requested **12 candidates**" → "the requested **ten questions in slot order**"; "the **fictional** target brand" → "the audited business … in the unnamed slots (1–6)". Every other word is verbatim | The count must not smuggle the experiment's twelve into the product contract; "fictional" was fixture-specific |
| C11 | Added **founder-calibrated examples** under Naturalness rules — the two exact supplied revisions, labeled "style guidance, not templates" | Preserves the 2026-09-17 decision-log feedback; also demonstrates that a need statement followed by its question is one request (the Q3 shape) |
| C12 | Added premise rule: "an unknown public fact may be asked about openly, but never written as already true" | Carries the fixture's "Jangan mengarang fakta tentang bisnis ini" and the journey's unknown-fact guidance into the fused instruction |
| C13 | "sample brand" → "one audited business" throughout | In production this is the real confirmed business; the specimen marks its input fictional inside the context, not the instruction |
| C14 | "Every supplied value is a confirmed fact" → **three kinds of information**: plain values are confirmed facts; `provenance:"buyer_constraint"` items are customer preferences/decision criteria — what the buyer cares about, never claims the business satisfies them; absent/null values are unknowns that may be asked about but never asserted | Required by the real projection's own shape: it emits provenance-tagged preference objects (`buyerConstraints`, `accessConstraints`), so a blanket "all confirmed fact" sentence would instruct the writer to treat preferences as verified business capabilities — contradicting the typed data and R5's fact/preference distinction |

Everything else is verbatim: the core A/B distinction, the
choosing-vs-understanding principle, the acceptance test wording, the
CHOICE JOB + CATEGORY + CONTEXT + 1–3 CRITERIA structure, the implicit-intent
section, the do-not-overfit fingerprint example, competitive openness, all ten
intent patterns, the naturalness rules, the reject list, and the four
evaluation dimensions.

**No second model call** is introduced anywhere: not for selection, not for
critique, not for retry. **No diversity quota** is added — the amendment is
embedded, and no minimum distinct-needs count exists in instruction, code, or
evaluation.

## 6. Twelve experiment candidates → ten product questions

The captured response produced **twelve unnamed candidates plus market
interpretation and self-critique**. The product pack is **ten ordered strings
bound to fixed slots: six unnamed, four named**.

- The first ten captured texts **cannot be relabeled** as the product pack:
  they are all unnamed (slots 7–10 have no source text at all — naming the
  business was forbidden in that request), they carry no slot assignment, and
  they were written against an unknown-slot contract. Taking "the first ten"
  would fabricate named questions that were never generated.
- The honest adaptation is to **ask the model directly for the ten ordered
  product questions with canonical slot semantics** — one call, one response.
  This is the C2–C4 change set.
- Market interpretation and self-critique **remain in the provider response**
  (C5–C6) as bounded provider-side sections: they are extracted for evidence
  and diagnostics only. R-30 limits what reaches the customer — ten strings —
  not what the model returns; keeping the analysis sections preserves the
  winning response mechanism that produced founder-acceptable wording.
  They never become customer questions, audit-answer inputs, or pack/telemetry
  metadata; if retained at all, they live only inside the restricted raw-
  response evidence the existing `capturingFetch` pattern already produces.
- The conflict this creates is precise and bounded: the recovered source
  optimizes a free candidate pool; the product binds each question to a
  measurement purpose. Slot 8's purpose ("whether the AI explicitly
  recommends the audited business") tends toward slightly survey-like
  phrasing ("Apakah Anda merekomendasikan X untuk …?") that a real consumer
  would rarely type. **Smallest proposed amendment if the pilot finds it
  unnatural:** adjust slot 8's `generatorSlotDescription` to permit natural
  direct-request forms ("Laundry X worth it nggak buat …?" still asks whether
  the model recommends it) — an R-19-permitted description strengthening,
  never a purpose change. Named now; no code anticipates it.

## 7. Confirmed input, provenance, and billing honesty

*This section is the target contract for the integrated path — the dormant
slice demonstrates only its offline half (projection → request), and the
"recorded per generation" items are deferred-boundary plumbing (§4b).*

- **Source:** only the customer-confirmed `BusinessBrief` reaches the route;
  the writer sees the `buildV3WriterContext` projection of
  `parseQuestionFactsV3` output — never raw review rows, never UI state,
  never `official_sources` (deliberately unmapped), never
  `known_accuracy_questions`/`conversion_action` (no writer mapping).
- **Binding:** `facts.binding` = `{requestId, factsRevision,
  factsFingerprint}`; fact changes invalidate the pack through the existing
  confirmed-facts flow. `requestId`/`factsRevision` need the route
  addition in §4b — deferred, not in this slice.
- **Recorded per generation:** system label, requested model
  `glm-5.3-flash`, returned model verbatim (observed `zai/glm-5.3-flash`),
  response id (`gen_…`), instruction version (new meta field), latency,
  usage tokens, billed cost from
  `cheaper_inference.billing.billed_cost_usd` when present, `fallback_used`,
  warnings, and `source` (`model`/`parsed`/`fallback`).
- **Cost language:** `billed_cost_usd` is the provider-billed truth;
  list-rate arithmetic is an **estimate**; USD 0.02 is a **proposed
  authorization limit**, not implemented anywhere. The tested 4096 cap and
  the observed USD 0.000371 charge do not establish the adapted request's
  needs and impose no spending cap.
- **Alias:** `zai/glm-5.3-flash` is the upstream namespaced form of the
  requested model (plausible routing label, per the capture) — recorded as
  **pending decision**. Until recorded, a returned-model mismatch triggers
  the existing provenance-error path: labeled fallback, failed telemetry,
  no silent acceptance, no prefix stripping.

## 8. Success behavior and the GLM-scoped validation boundary

**Dormant slice:** a well-formed three-section response →
`extractIndonesianSlotQuestions` yields exactly ten strings in slot order →
`validateIndonesianQuestionPackV3` (below) → clean. Any failure is explicit,
with the original response preserved for review (§9) — no repair,
`PromptPack`, review screen, telemetry, or history in this slice; all of
that is deferred (§4b).

**The GLM-only validation boundary (R1 fix).** The legacy
`validateCanonicalIndonesianQuestionPack` cannot judge GLM output: its
`question_form` rule (`questions-id.ts:683-692`) requires exactly one
terminal `?`, which rejects the founder's own accepted direct-request
wording, and its blanket superlative rule rejects R5 §5.2 *open
preferences* ("…yang pilihannya terlengkap…"), which are permitted asks,
not capability claims. The dormant slice therefore defines
`validateIndonesianQuestionPackV3` — same composition/identity/premise/
safety/comparison checks, **plus** the already-approved R5 §§5.1–5.2 forms:

- **§5.1 direct requests — the exact mechanical contract** (no semantic or
  sentence-count gate is added): preserve the nonempty and length checks.
  A terminal question mark is optional. Reject more than one `?`; if one
  occurs, it must be at the end after trimming. Do not add a grammar
  classifier, sentence-count rule, or semantic edit gate — context
  sentences followed by one request are not rejected for containing
  multiple sentences (the founder's accepted laptop request has three;
  accepted invoice Q3 has two). Semantic quality remains an exact-text
  review question, not a mechanical one.
- **§5.2 open preferences:** a superlative/relative phrasing that asks for a
  preference ("mana yang pilihannya terlengkap") is allowed; a phrasing that
  *asserts* a particular business is the most/only/best remains
  `unsupported_premise`.

Focused offline cases must use the **complete** founder texts, not
shortened substitutes: "Laptop saya mulai lemot. Kayaknya butuh beli baru.
Cariin dong toko laptop di Bandung/Cimahi yang bagus." and "Bikin invoice
tiap bulan capek kalau manual. Biasanya UMKM pakai aplikasi apa sih?" — both
must pass `question_form` under v3. Identity, comparison, safety, and
supported-premise protections are retained unchanged.

Shipped v2 behavior is preserved — the legacy validator and its callers are
untouched; the v3 variant applies only to the GLM path and to customer edits
of GLM packs once the deferred plumbing exists.

**Truthful per-text origin — deferred-integration requirement (§4b), not
prototype behavior.** The probes showed a partial repair reports
`source:"parsed"` + `fallback_used:false` while silently substituting
deterministic text (`warnings: ["slot_safety_repair:1"]` is the only clue).
When the GLM path is later wired in, each extracted question must carry an
honest per-text origin (`model` | `repaired`) and the pack's `source` must
reflect partial substitution (e.g., `source:"parsed"` with
`fallback_used:true` and a per-slot marker) rather than implying every line
is model output. The dormant slice itself performs no repair and generates
no replacement text — failures stay explicit (§9).

**Fallback limitation, exposed not hidden.** The deterministic fallback
itself keeps the informational slot-2 form `Dalam situasi apa … biasanya
mencari …?` (`questions-id.ts:559-560`), which is not
recommendation-eligible by the winning instruction's own acceptance test.
This draft does **not** declare old fallback quality accepted, and repairing
the fallback's question forms is out of this slice — so the first prototype
stays outside customer dispatch (§1).

## 9. Failure and malformed-output behavior — stated for the dormant slice

In this prototype there is **no fallback, `PromptPack`, or telemetry** —
every failure is an explicit parse/validation/transport failure with the
original response preserved for review. Replacement-question generation
(fallback) and per-text origin marking are requirements of the deferred
integration (§4b, §8), not behavior this slice performs.

| Event | Dormant-slice behavior |
| --- | --- |
| Non-2xx / provider `error` / transport exception / 180 s timeout | Explicit failure; raw response/error evidence preserved for review; no replacement questions |
| Refusal or empty assistant text | Same |
| `finish_reason` ≠ `"stop"` (truncation) | Same — an incomplete response is never partially trusted |
| Returned model missing or ≠ requested | Explicit provenance failure (pending the exact-pair alias decision); both identifiers recorded verbatim |
| Missing/duplicated `## 1.`/`## 2.`/`## 3.` markers, or markers out of order | Extract `null` → explicit parse failure |
| Fewer/more than ten numbered items, out-of-order or malformed numbering | Extract `null` → explicit parse failure |
| Any other line inside the `## 2.` span (wrapped continuation, prose, stray numbers) | Extract `null` → explicit parse failure — text is rejected, never silently dropped |
| Trailing self-critique after item 10 | Impossible by construction: extraction is bounded by the `## 3.` marker |
| `INPUT_CORRECTION_REQUIRED` from facts projection | Explicit correction outcome, zero provider calls — no route/UI path exists yet to deliver it (§4b) |

Deferred-integration mapping (for the later slice, not this one): each row
above maps to the existing labeled-fallback path — `source:"fallback"` +
`fallback_used` + failed telemetry — **with** the §8 per-text origin fix so
partial repair can no longer masquerade as fully parsed output.

One client request, zero client retries. The gateway may make upstream
attempts internally (attempt one showed three provider-side attempts) —
that is provider-internal routing, not a client retry, and not something
this slice controls.

## 10. Editable review — current behavior and the GLM gap

`QuestionReviewScreen` behavior is identical regardless of writer at the UI
level: ten slot-bound cards, `Ubah` → `introducedQuestionEditIssues` →
`onEdit`; slot metadata, 6/4 composition, and purposes fixed; generation and
editing never start the audit — only `Jalankan audit` → `Mulai audit
sekarang` consumes the order. The preparing state should show honest elapsed
time for a call that can now wait up to 180 s.

Two gaps the revision-1 draft glossed over, now stated honestly:

- `editPrompt` mutates `prompt.question` directly; the edit-history helpers
  (`applyIndonesianQuestionEdits`, `approveIndonesianQuestionPack`) have no
  caller outside tests. Whether a `{order, from, to, edited_at}` record
  reaches the persisted/replayed pack is **unverified** — the deferred slice
  must wire it or document the actual record kept.
- `questionEditTransaction` runs the **legacy** validator, so a customer
  typing the founder's accepted direct-request shape would be refused as
  `question_form`. GLM packs need the v3 rules on the edit path too — a
  deferred-boundary item (§4b), not something this dormant slice solves.

## 11. The 180-second wait — support check

- **Evidence-send client:** no ready runner exists for this specimen.
  `run-check-180s.mjs` reads its adjacent frozen `request.json`, pins hash
  `7fc69cc3…9fc9`, and expects twelve candidates — sent unchanged it would
  dispatch the *old invoice experiment*, and swapping its request trips its
  own hash guard. It is a transport reference, not this specimen's runner.
  A future, separately bounded offline preparation must create and review a
  **new capture artifact** that freezes the actual request body at
  `REQUEST_SPECIMEN.json.request` (not the surrounding review metadata),
  carries forward shared outcome assessment, nested billing extraction,
  honest requested/returned model handling, restricted evidence modes, the
  180 s wait and zero client retries, and freezes new artifact hashes before
  any authorization request. The original runner and its frozen request stay
  untouched. No such runner is requested or authorized now.
- **Customer-route client (deferred):** `postJson` has no timeout; the
  passed signal aborts only on supersession/navigation
  (`AuditOperationGeneration` — no timer). Nothing client-side kills the
  request before 180 s. ✓ verified in code
- **Provider client (deferred):** `responsesGenerate`/`geminiGenerate` today
  have **no** timeout at all; the deferred `cheaperInferenceGenerate` adds
  `AbortSignal.timeout(180_000)` — new but trivial. ✓ proposed
- **Route:** `runtime = "nodejs"`. The production deployment is a Cloudflare
  Worker (`nodejs_compat`). Whether the deployed route tolerates a 180 s
  provider wait is **unverified** — flagged as a pre-adoption check, not
  claimed.
- **Evidence for the value:** attempt one's provider-side total was 66.7 s
  (founder screenshots); attempt two completed in 53.3 s client-side. 180 s
  is headroom, not an acceptance of slow production behavior.

## 12. R5 gates — affected requirements and narrow proposed amendments

The dormant slice stays behind the gates; the amendments cover exactly its
scope and nothing more:

- **R5 §7 / G2P** — "Required before G3–G5 plumbing." The 2026-09-17
  captures are connection samples on the *experimental* contract.
  **Proposed amendment:** "The 2026-09-17 GLM captures are bounded
  *connection evidence* — usable for transport verification (endpoint, auth,
  alias, billing path, latency envelope) and prompt-fidelity review —
  explicitly not a pilot pass. A dormant, unrouted request/response adapter
  for the adapted contract may be built and offline-tested without further
  amendment; it has no live caller. A single send of the adapted request,
  separately authorized in writing, produces contract evidence only — it is
  not the frozen G2P pilot and does not authorize integration." G2P still
  requires the frozen pilot on the adapted ten-slot request before any
  G3–G5 plumbing.
- **Historical `not_retained` preserved.** The original G2P pilot **ran**
  and returned `not_retained`; that result stands as history and is not
  relabeled. The *adapted* GLM pilot has never run — "the pilot has not
  run" refers to it, not to the original.
- **R5 §8.1** — "Record amendments before adopting simple, removing
  reserves, or changing metadata/schema." The pilot corpus is **four
  businesses with AC repeated — five attempts per arm**, not a five-business
  corpus (correcting revision-1's wording). The adapted request asks the
  model for the *simple-contract* product shape (ten ordered strings to the
  customer); market interpretation and self-critique remain provider-side
  response sections, not returned metadata fields.
  **Proposed amendment:** "The adapted GLM writer is evaluated as the
  §8.1 simple-contract shape: ten final strings to the customer; the
  response's analysis sections are provider-side evidence, not contract
  fields. Component decisions on reserves and rich metadata remain open;
  adopting it permanently still requires the frozen pilot outcome and the
  recorded component amendments."
  The sectioned GLM response stays **distinguished** from the previously
  frozen simple-control request: its future evaluation requires an
  explicitly frozen configuration/amendment, never silent reuse of the old
  control label. No new pilot design is needed for the dormant slice.
- **Model-alias policy** (new small record beside §8.1): propose **at most
  the exact pair** — "`zai/glm-5.3-flash` is an accepted returned
  identifier for requested `glm-5.3-flash` on Cheaper Inference." One
  observed pair does not justify a wildcard `zai/<model>` mapping. Both
  identifiers are persisted verbatim; equality is evaluated only through
  the declared pair mapping, never by silently stripping prefixes. Until
  recorded, strict equality stands and the protected path falls back.
- **§4.2 wording:** the contract is **one client request, zero client
  retries** — not "zero client attempts." Upstream gateway attempts are
  provider-internal and already observed (three on attempt one). No
  amendment needed — just don't misreport it.

**Evidence still needed before activation:** frozen G2P pilot on the adapted
request (four businesses, AC repeated — five attempts per arm), naturalness
and recommendation-eligibility review of exact final texts, the recorded
alias decision, 180 s support verification on the deployed route, provider
feasibility of the adapted request (token usage for the richer context and
the restored analysis sections is untested), and the deferred-boundary work
in §4b with its own gate.

## 13. Remaining decisions

**Genuine founder/orchestrator choices:**

1. Alias acceptance — the exact pair `glm-5.3-flash` →
   `zai/glm-5.3-flash` only (§12). Until recorded, strict equality stands
   and everything falls back.
2. Whether slot 8's description needs the §6 amendment — deferred to pilot
   evidence; no code anticipates it.
3. Whether and when to authorize the single adapted-contract send for
   contract evidence — recommended shape: a new, separately prepared capture
   artifact freezing `REQUEST_SPECIMEN.json.request` (§11), authorized in
   writing — not the customer route, and not `run-check-180s.mjs`, which is
   pinned to the old invoice request.

**Routine implementation choices inside approved scope — concrete
recommendations, not founder decisions:**

4. `cost_basis: "provider_billed"` — recommended new enum member; the
   existing `"provider_usage"` is an estimate basis, and billing a billed
   amount under it would mislabel the provenance the same way revision-1's
   fallback did.
5. `instruction_version` — one new generation-meta field; recommended
   value `"glm-writer-2026-09-17"` stamped only on GLM packs, shipped v2
   untouched.
6. `max_tokens` — keep the tested `4096` for the specimen/first send; the
   restored analysis sections add modest output, and 4096 covered a
   12-candidate+analysis response already. Revisit only on truncation
   evidence.
7. `requestId`/`factsRevision` source — recommended: a per-confirmation id
   and monotonically increasing revision supplied by `AuditWorkflow` in the
   deferred slice; `factsFingerprint` already binds content.

## 14. Focused offline checks run for this draft

- Frozen request parsed; sha256 `7fc69cc3…9fc9` verified; content shown to
  equal recovered-prompt body (`652cfeda…`) with only the fixture
  substitution + appended amendment.
- `parseNumberedIndonesianQuestions` read: leading text → `null`; item
  count ≠ 10 → `null`; continuation lines glue onto the current item. The
  bounded `## 2.`/`## 3.` span in the revised contract removes that gluing
  risk rather than inheriting it.
- `liveIndonesianQuestionProviderName`, `protectedQuestionGenerationProvenanceError`,
  `buildLiveIndonesianPromptPack`, `minimizeIndonesianBrief`,
  `parseQuestionFactsV3`, `buildV3WriterContext`, `V3_CONTEXT_MAP`,
  `AuditOperationGeneration`, `postJson`, `route.ts`,
  `QuestionReviewScreen`, `questionEditTransaction`, `editPrompt`,
  `applyIndonesianQuestionEdits`/`approveIndonesianQuestionPack` (no
  callers outside tests — verified by grep), the `question_form` rule
  (`questions-id.ts:683-692`), the slot-2 fallback form
  (`questions-id.ts:559-560`), and `self_check`
  (`questions-id-live.ts:353-363`) all read on `main` — every claim in
  §§3–4 and §§8–10 cites the real symbol.
- GLM branch (`2dbd867`) transport read as reference only.
- `REQUEST_SPECIMEN.json` parses; contains no credential material; differs
  from the captured request in fixture, instruction, output contract, and
  count; the founder amendment and both exact founder wordings appear
  inside it.
- Its embedded "Confirmed business context" is **real adapter output** —
  `parseQuestionFactsV3` → `buildV3WriterContext` run offline (jiti) on the
  fictional `BusinessBrief` recorded in `fixtureFacts.input`; it projected
  cleanly (`status: "projected"`, limitations `["competitive_role_unknown"]`)
  and is byte-identical to the serialized result, so permission fields are
  genuinely deduplicated and `serviceChannels`/`marketContext.reach` show
  truthful `null`/empty values rather than invented ones. Two earlier
  hand-written-context defects — a duplicated `marketContext` field and
  typed values (`entityType`, `whole-brand` scope, local areas, service
  channels) that the factsContext-free brief path cannot produce — were
  caught and corrected by switching to the real adapter output. Verified:
  6 unnamed / 4 named, no forbidden identity strings inside any unnamed
  slot context, slot 9 carries the named comparator, `fixtureOnly` marker
  present.
- Instruction revised per the reviews: facts/preferences/unknowns
  distinguished (C14), three-section output restored with strict
  extraction (C5/C6), and the "no answers/explanations" requirement scoped
  to section-2 question text (C15). Re-verified: amendment core verbatim,
  both founder examples verbatim, all three `##` markers present, no stale
  flat-output contract remains.
- Revision-3 checks: specimen re-parsed after the scoped-bullet edit;
  extractor spec now rejects (not drops) wrapped continuation lines,
  duplicate/missing markers, malformed numbering, and in-span prose —
  including the review's `1. Cariin dong toko laptop yang bagus` /
  `di Bandung/Cimahi.` counterexample; §8's `question_form` wording is now
  the exact R5 §5.1 mechanical contract; §§1/8/9 no longer route prototype
  failures into fallback or telemetry; §11 states plainly that
  `run-check-180s.mjs` is pinned to the old invoice request (hash
  `7fc69cc3…`) and a new capture artifact freezing
  `REQUEST_SPECIMEN.json.request` is required — none is requested now.
- **Disclosed error:** revision-1's return reported specimen hash
  `eb21556e…051d`; the file's actual reviewed hash was `bcd6cda4…` — the
  report was wrong. Full current hashes are in §15 and the worker return.
- **Not run and not claimed:** no provider call, no credential read, no
  adapted-prompt quality evaluation, no G2P evidence, no deployed-route
  timeout verification, no application test suite run (documentation-only
  revision).

## 15. File integrity (revision 2)

| File | SHA-256 |
| --- | --- |
| `REQUEST_SPECIMEN.json` | `e521721626af770881332d6efd432b9b2171536d05cc59a7661ca69a00dec9b4` |
| `INTEGRATION_DRAFT.md` | self-referential — hash of this file excluding this table cannot be stable; hash reported in the worker return instead |
| Revision-2 specimen | `0b643e551b388c0226d0300b53db0cfaa5b606be4105a4a6f80a68b120559ca6` |
| Reviewed revision-1 specimen | `bcd6cda4084e9b71701414a2f2df105f28ffceea240ebf072fe882a146282865` (per ORCHESTRATOR_REVIEW.md) |
| Frozen captured request | `7fc69cc31cd2287a0e134bae51b2c02671eeb1b0e0b17039743851832c309fc9` (unchanged, untouched) |
