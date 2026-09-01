# Journey fixtures: frozen handoffs for modules 03 / 04 / 05 / 06

> Status: **Draft — fiction reconciled 2026-08-17** (founder approval of the
> fixture document still pending; Spec 002 open question 4)
> Owner: Nuave orchestrator (leaf-worker draft)
> Updated: 2026-09-01
> Implements: [`docs/JOURNEY_CONTRACT.md`](../JOURNEY_CONTRACT.md) — "Required
> handoff fields" and "Module ownership and handoffs"

> **Supersession note (2026-09-01):** This draft records pre-Spec 007 fixture
> decisions and is not current product or measurement authority. The runnable
> V1 uses Spec 007's fixed 10-slot matrix (6 unnamed + 4 named), with official
> website and Instagram as the supported source inputs; Google Maps is deferred.
> The 5/5 arithmetic and synthetic Maps examples below remain only as clearly
> historical fixture data.

This document specifies **three frozen fixtures** — one per versioned handoff —
so that modules 03 (Business Facts), 04 (Questions), 05 (Audit Run), and 06
(Audit Report) can be developed in parallel against stable, non-moving
handoffs. It is a fixture *specification*, not an implementation specification
and not a code change.

## Hard rules for this fixture set

1. **The existing golden fixture must not be modified.**
   `src/lib/audit/fixtures/report-golden.ts` is the historical Phase-1
   implementation record and remains protected. It currently contains **9
   completed observations + 1 FAILED observation**:

   | Slot | `prompt_id` | Question | `run_status` | `failure_reason` |
   |---|---|---|---|---|
   | index 0–3 | NEED-01, NEED-02, SOLUTION-01, SOLUTION-02 | first four discovery questions | `completed` | — |
   | index 4 | `NUAVE-BRAND-COMPARISON-01` | "How do local export advisers differ in their support?" | `failed` | "Synthetic provider timeout." |
   | index 5–9 | COMPARISON-02, VALIDATION-01, VALIDATION-02, ACTION-01, ACTION-02 | named-business questions | `completed` | — |

   Because one observation is `failed`, the golden fixture **cannot** satisfy
   the `10/10` report gate. It stays exactly as it is.
2. **The new 10/10 evidence fixture is additive and independent.** It is a
   separate frozen record for the fictional **Kopi Taman Senja** business. It
   reuses *no* golden data, and no future module may "complete" the golden
   failure by pointing it at the new fixture.
3. **Everything in these fixtures is fictional.** Business names, people,
   answers, findings, and source URLs are synthetic. Every URL uses a reserved
   `.example` domain. No real customer, business, provider call, or payment is
   represented.
4. **No code is changed, and no existing worktree change is touched.** The
   repository currently carries substantial uncommitted work; this document is
   added alongside it without disturbing anything.

## Why three fixtures

The `JOURNEY_CONTRACT.md` handoff table defines three versioned boundaries that
the four modules share:

| Handoff | Minimum server-owned fields (contract) | Frozen fixture below |
|---|---|---|
| 03 → 04 | Confirmed fact version, exact business and scope, source/provenance status, customer confirmation, warnings | § "Fixture A — 03 → 04 business facts" |
| 04 → 05 | Approved question-pack version, exact ordered ten strings, final name/no-name classification, edit record, approval timestamp | § "Fixture B — 04 → 05 question pack" |
| 05 → 06 | Frozen evidence-set version, ten selected evaluable observations, every attempt, method/version record, sources, completion timestamp, recorded support recovery when used | § "Fixture C — 05 → 06 evidence set" |

The three fixtures share one fictional order reference and form a single
internally consistent chain:

```text
NVA-FIKTIF-001.facts.v1    (03 → 04)
  → NVA-FIKTIF-001.questions.v1  (04 → 05)
  → NVA-FIKTIF-001.evidence.v1   (05 → 06)
```

## Superseded historical composition decision: 5/5, not 6/4

This section records the pre-Spec 007 choice for these historical fixtures, not
the current V1 contract. The former fixture default was a **5 / 5** composition
— five
**Tanpa menyebut bisnis Anda** questions and five **Menyebut bisnis Anda**
questions — even though the fictional sample report in
`docs/journey/06-audit-report.md` demonstrates a **6 / 4** composition.

**Current direction:** Spec 007 R-01/R-02 supersedes this choice. Current V1
packs use ten fixed slots: 6 unnamed and 4 named, with slot policies attached
to the canonical matrix. Do not use this section to implement or update the
current journey.

Rationale (documented so no later module "corrects" it back):

1. `docs/journey/04-questions.md`, settled product decision **#4**, states the
   suggested pack "starts with five questions that do not name the business and
   five that do." This is the canonical *default suggestion*.
2. `docs/JOURNEY_CONTRACT.md` cross-module invariant **#8** and the report
   contract both assume the two composition measures, and the current
   `PROMPT_MATRIX` / `promptPackSchema` already encode 5 unbranded + 5 branded
   (`unbranded_prompts: 5`, `branded_prompts: 5`).
3. The 06 sample explicitly states it uses "six questions without the business
   name and four with it **to demonstrate dynamic composition**" — i.e. it is an
   illustration of the post-edit state, not the default. Its 6/4 split (and its
   English placeholder copy) is therefore *not* the normative fixture shape.

Historical consequence: the frozen question pack and evidence set below use the
5/5 default. That record is not a current 6/4 pack and its old customer-editing
assumptions are superseded by Spec 007 R-10's fixed-slot editing contract.

---

## Fixture A — 03 → 04 business facts

Matching `docs/journey/03-business-facts.md` required fields and the
`03 → 04` handoff fields (confirmed fact version, exact business and scope,
source/provenance status, customer confirmation, warnings).

### A.1 Field shape

| Field | Type | Required | Notes |
|---|---|---|---|
| `fact_version_id` | string | yes | Immutable; new correction ⇒ new version |
| `order_reference` | string | yes | Fictional paid-order reference |
| `status` | `"facts_confirmed"` | yes | Terminal state for this handoff |
| `business.name` | string | yes | Exact audited business name |
| `business.scope` | string | yes | Exact branch / city / service area |
| `business.category.value` | string | yes | One primary category |
| `business.category.suggestions` | string[] | no | ≤ 3 chips |
| `business.category.provenance` | enum | yes | Provenance label (below) |
| `business.short_description` | string | no | Factual, no praise/rank/outcome |
| `business.official_sources[]` | object | ≥ 1 | `{ url, type, label }`; only official types |
| `products_services[]` | object | 1–3 | `{ value, selected, provenance }`; selected ≤ 3 |
| `customer_context.who` | string | yes | Required (materially shapes questions) |
| `customer_context.needs` | string | no | Recommended |
| `customer_context.considerations` | string | no | Recommended |
| `customer_context.provenance` | enum | yes | Always a Nuave suggestion |
| `differentiator` | object \| null | no | `{ value, provenance }`; unsupported superlatives removed |
| `comparison_business` | object \| null | no | `{ name, category, scope, source_url, reason }` |
| `changed_or_incorrect` | string | no | Starts empty by rule |
| `confirmation.confirmed` | boolean | yes | Customer checkbox + primary action |
| `confirmation.confirmed_at` | ISO 8601 | yes | |
| `warnings[]` | object | no | `{ kind, field, message, versions[] }` |
| `provenance_status` | object | yes | Per-source "Ditemukan / Saran / Anda" rollup |

Provenance label enum (from `03`): `found_website`, `found_google_maps`,
`found_instagram`, `suggestion_nuave`, `customer_supplied`, `needs_review`.

### A.2 Frozen value

```jsonc
{
  "fact_version_id": "NVA-FIKTIF-001.facts.v1",
  "order_reference": "NVA-FIKTIF-001",
  "status": "facts_confirmed",

  "business": {
    "name": "Kopi Taman Senja",
    "scope": "Dago, Bandung",
    "category": {
      "value": "Kedai kopi",
      "suggestions": ["Kafe", "Ruang kerja bersama"],
      "provenance": "suggestion_nuave"
    },
    "short_description": "Kopi Taman Senja adalah kedai kopi dan ruang kerja di Bandung yang menawarkan kopi lokal, makanan ringan, serta area untuk bekerja dan berkumpul.",
    "official_sources": [
      { "url": "https://kopitamansenja.example",       "type": "website",      "label": "official" },
      { "url": "https://maps.example/kopi-taman-senja", "type": "google_maps",  "label": "official" },
      { "url": "https://instagram.example/kopitamansenja", "type": "instagram", "label": "official" }
    ]
  },

  "products_services": [
    { "value": "Kopi lokal",     "selected": true, "provenance": "suggestion_nuave" },
    { "value": "Ruang kerja",    "selected": true, "provenance": "suggestion_nuave" },
    { "value": "Makanan ringan", "selected": true, "provenance": "suggestion_nuave" }
  ],

  "customer_context": {
    "who": "Pekerja remote, mahasiswa, dan komunitas kecil di Bandung.",
    "needs": "Tempat untuk bekerja atau bertemu dengan Wi-Fi, makanan, dan minuman.",
    "considerations": "Lokasi, suasana, fasilitas, harga, dan jam buka.",
    "provenance": "suggestion_nuave"
  },

  "differentiator": {
    "value": "Menggunakan kopi dari produsen lokal sekaligus menyediakan area untuk bekerja dan pertemuan kecil.",
    "provenance": "suggestion_nuave"
  },

  "comparison_business": {
    "name": "Kopi Ruang Pagi",
    "category": "Kedai kopi dan ruang kerja",
    "scope": "Dago, Bandung",
    "source_url": "https://kopiruangpagi.example",
    "reason": "Menawarkan kedai kopi dan area kerja dalam wilayah yang sama."
  },

  "changed_or_incorrect": "",

  "confirmation": {
    "confirmed": true,
    "confirmed_at": "2026-08-17T01:30:00.000Z"
  },

  "warnings": [
    {
      "kind": "source_conflict",
      "field": "opening_hours",
      "message": "Website mencantumkan jam buka 08.00–21.00, sedangkan simulasi Google Maps mencantumkan 09.00–20.00.",
      "versions": [
        { "source_url": "https://kopitamansenja.example", "value": "08.00–21.00" },
        { "source_url": "https://maps.example/kopi-taman-senja", "value": "09.00–20.00" }
      ]
    }
  ],

  "provenance_status": {
    "found_website":     ["business.name", "business.scope", "official_sources.0"],
    "found_google_maps": ["official_sources.1"],
    "found_instagram":   ["official_sources.2"],
    "suggestion_nuave":  ["business.category", "business.short_description", "products_services", "customer_context", "differentiator", "comparison_business"],
    "customer_supplied": [],
    "needs_review":      ["business.scope"]
  }
}
```

> Reconciliation note (resolved 2026-08-17): the `opening_hours` warning above
> uses the numbers from `03`'s simulation (08.00–21.00 vs 09.00–20.00), which
> the orchestrator declared canonical. `06`'s English sample used different
> placeholder numbers (08:00–22:00 vs 09:00–22:00); those are superseded. The
> frozen fixture chain is the implementation source of truth (see "Escalated
> product decisions").

---

## Fixture B — 04 → 05 question pack

Matching `docs/journey/04-questions.md` and the `04 → 05` handoff fields
(approved question-pack version, exact ordered ten strings, final name/no-name
classification, edit record, approval timestamp).

### B.1 Field shape

| Field | Type | Required | Notes |
|---|---|---|---|
| `question_pack_version_id` | string | yes | Immutable |
| `order_reference` | string | yes | |
| `fact_version_id` | string | yes | Binding; a fact change supersedes the pack |
| `status` | `"questions_approved"` | yes | |
| `language` | `"id-ID"` | yes | |
| `generation` | object | yes | One bounded no-search call provenance |
| `questions[]` | object × 10 | yes | Exact order preserved |
| `questions[].order` | int 1–10 | yes | |
| `questions[].text` | string | yes | Exact customer-approved string |
| `questions[].final_classification` | enum | yes | `tanpa_menyebut_bisnis_anda` \| `menyebut_bisnis_anda` |
| `questions[].original_suggestion` | string | no | The Nuave suggestion, kept separately |
| `questions[].suggested_category` | enum | no | Internal coverage role only |
| `questions[].edited` | boolean | yes | Whether the customer changed the text |
| `edit_record[]` | object | no | Empty for the canonical default |
| `classification_summary` | object | yes | `{ total, tanpa, menyebut }` |
| `warnings_acknowledged[]` | object | no | Advisory coverage warnings |
| `approval.approved` | boolean | yes | |
| `approval.approved_at` | ISO 8601 | yes | |
| `lock` | object | yes | `{ locked, consumed, started_at }` |

The two classification values are the Indonesian labels from `04`/`06`:
**Tanpa menyebut bisnis Anda** and **Menyebut bisnis Anda**. They are computed
from the final text, never from the original suggestion.

### B.2 Frozen value

```jsonc
{
  "question_pack_version_id": "NVA-FIKTIF-001.questions.v1",
  "order_reference": "NVA-FIKTIF-001",
  "fact_version_id": "NVA-FIKTIF-001.facts.v1",
  "status": "questions_approved",
  "language": "id-ID",

  "generation": {
    "system": "Google Gemini API",
    "requested_model": "gemini-3.5-flash-lite",
    "returned_model": "gemini-3.5-flash-lite",
    "instruction_version": "question-writer-v1",
    "generated_at": "2026-08-17T01:45:00.000Z",
    "fallback_used": false,
    "telemetry": {
      "latency_ms": 4100,
      "input_tokens": 1480,
      "output_tokens": 462,
      "accounted_cost_usd": 0.0021,
      "cost_basis": "provider_usage",
      "pricing_version": "gemini-flash-lite-v1"
    }
  },

  "questions": [
    { "order": 1, "text": "Rekomendasikan tempat yang asik untuk ngopi dan WFC di Dago.", "final_classification": "tanpa_menyebut_bisnis_anda", "original_suggestion": "Rekomendasikan tempat yang asik untuk ngopi dan WFC di Dago.", "suggested_category": "need_discovery", "edited": false },
    { "order": 2, "text": "Tempat rapat kecil di Bandung yang ada makanan, minuman, dan bisa dipakai kerja di mana ya?", "final_classification": "tanpa_menyebut_bisnis_anda", "original_suggestion": "Tempat rapat kecil di Bandung yang ada makanan, minuman, dan bisa dipakai kerja di mana ya?", "suggested_category": "need_discovery", "edited": false },
    { "order": 3, "text": "Kedai kopi apa aja di Dago yang cocok untuk WFC atau meeting?", "final_classification": "tanpa_menyebut_bisnis_anda", "original_suggestion": "Kedai kopi apa aja di Dago yang cocok untuk WFC atau meeting?", "suggested_category": "solution_discovery", "edited": false },
    { "order": 4, "text": "Di mana ada cafe yang menyediakan kopi lokal dan bisa untuk kerja atau WFC di Bandung?", "final_classification": "tanpa_menyebut_bisnis_anda", "original_suggestion": "Di mana ada cafe yang menyediakan kopi lokal dan bisa untuk kerja atau WFC di Bandung?", "suggested_category": "solution_discovery", "edited": false },
    { "order": 5, "text": "Bandingkan coffee shop di Bandung yang asik untuk kerja, harganya affordable, dan buka sampai malam.", "final_classification": "tanpa_menyebut_bisnis_anda", "original_suggestion": "Bandingkan coffee shop di Bandung yang asik untuk kerja, harganya affordable, dan buka sampai malam.", "suggested_category": "comparison", "edited": false },
    { "order": 6, "text": "Bandingin Kopi Taman Senja vs Kopi Ruang Pagi untuk WFC dan meeting di Dago.", "final_classification": "menyebut_bisnis_anda", "original_suggestion": "Bandingin Kopi Taman Senja vs Kopi Ruang Pagi untuk WFC dan meeting di Dago.", "suggested_category": "comparison", "edited": false },
    { "order": 7, "text": "Kopi Taman Senja bisa dipakai WFC atau kerja nggak ya? Kopi yang disediakan kopi apa?", "final_classification": "menyebut_bisnis_anda", "original_suggestion": "Kopi Taman Senja bisa dipakai WFC atau kerja nggak ya? Kopi yang disediakan kopi apa?", "suggested_category": "validation", "edited": false },
    { "order": 8, "text": "Di mana alamat Kopi Taman Senja? Buka jam berapa?", "final_classification": "menyebut_bisnis_anda", "original_suggestion": "Di mana alamat Kopi Taman Senja? Buka jam berapa?", "suggested_category": "validation", "edited": false },
    { "order": 9, "text": "Cariin kontak Kopi Taman Senja.", "final_classification": "menyebut_bisnis_anda", "original_suggestion": "Cariin kontak Kopi Taman Senja.", "suggested_category": "action", "edited": false },
    { "order": 10, "text": "Kopi Taman Senja ada parkiran mobil dan mushollanya nggak?", "final_classification": "menyebut_bisnis_anda", "original_suggestion": "Kopi Taman Senja ada parkiran mobil dan mushollanya nggak?", "suggested_category": "action", "edited": false }
  ],

  "edit_record": [],

  "classification_summary": {
    "total": 10,
    "tanpa_menyebut_bisnis_anda": 5,
    "menyebut_bisnis_anda": 5
  },

  "warnings_acknowledged": [],

  "approval": {
    "approved": true,
    "approved_at": "2026-08-17T02:00:00.000Z"
  },

  "lock": {
    "locked": false,
    "consumed": false,
    "started_at": null
  }
}
```

---

## Fixture C — 05 → 06 evidence set (10/10 evaluable)

Matching `docs/journey/05-audit-run.md` and the `05 → 06` handoff fields (frozen
evidence-set version, ten selected evaluable observations, every attempt,
method/version record, sources, completion timestamp, recorded support recovery
when used). **All ten observations are evaluable — there is no failed test** —
so the `10/10` report gate passes deterministically.

### C.1 Field shape

| Field | Type | Required | Notes |
|---|---|---|---|
| `evidence_set_version_id` | string | yes | Immutable |
| `order_reference` | string | yes | |
| `fact_version_id` | string | yes | |
| `question_pack_version_id` | string | yes | |
| `status` | `"evidence_ready"` | yes | |
| `method_record` | object | yes | One provider/method per run |
| `run` | object | yes | start/complete timestamps, concurrency, support |
| `observations[]` | object × 10 | yes | Exact question order preserved |
| `gate` | object | yes | `{ total, evaluable, failed, passed }` |

**`method_record`** (`05` settled decisions #5, #3, #15):

| Field | Frozen value |
|---|---|
| `system` | `"OpenAI Responses API"` |
| `requested_model` | `"gpt-5.6-luna"` |
| `returned_model` | `"gpt-5.6-luna"` |
| `language` | `"id-ID"` |
| `location` | `{ country: "Indonesia", city: "Bandung" }` |
| `web_search_required` | `true` |
| `reasoning` | `"low"` |
| `method_version` | `"audit-method-v1"` |
| `instruction_version` | `"neutral-response-v1"` |

**Each `observations[]` item:**

| Field | Type | Notes |
|---|---|---|
| `order` | int | 1–10 |
| `question` | string | Exact locked text from Fixture B |
| `classification` | enum | Final name/no-name classification |
| `appearance_classification` | enum | Plain-language result status (six values below) |
| `dimensions` | object | Code-level result dimensions (below) |
| `run_status` | `"completed"` | Never `"failed"` in this fixture |
| `selected_observation` | object | The one evaluable response chosen |
| `selected_observation.response_id` | string | |
| `selected_observation.raw_answer` | string | Full Indonesian answer |
| `selected_observation.answer_excerpt` | string | Exact excerpt shown in the report |
| `selected_observation.sources[]` | `{ url, title }` | Clickable, `.example` only |
| `selected_observation.observed_at` | ISO 8601 | |
| `attempts[]` | object | Every attempt in order; here exactly one successful attempt each |
| `attempts[].telemetry` | object | Cost/usage record per attempt |

**`appearance_classification` enum** — six plain-language values used by the
report's test-by-test section:

| Value | Meaning | Maps to `dimensions` |
|---|---|---|
| `did_not_appear` | business not mentioned | appearance `absent`, recommendation `not_recommended`, comparison `not_observed`, information `not_assessed` |
| `appeared` | mentioned, public info confirmed | appearance `mentioned`, information `confirmed` |
| `mentioned_not_recommended` | mentioned but not preferred | appearance `mentioned`, recommendation `not_recommended`; comparison `competitor_preferred` when a comparison was assessed |
| `recommended` | mentioned and preferred | appearance `mentioned`, recommendation `recommended`; comparison `client_preferred` when a comparison was assessed |
| `incomplete` | mentioned, public info incomplete | appearance `mentioned`, information `incomplete` |
| `conflicting` | mentioned, public info conflicting | appearance `mentioned`, information `conflicting` |

The code-level `dimensions` object carries the four result dimensions from
`src/lib/audit/types.ts` (`appearance`, `recommendation`, `comparison`,
`information`) so an implementor can drive the report contract directly from the
fixture. A factual address/contact/facility question must remain
`recommendation: "not_assessed"` rather than a failed recommendation.

### C.2 Frozen value (method, run, gate)

```jsonc
{
  "evidence_set_version_id": "NVA-FIKTIF-001.evidence.v1",
  "order_reference": "NVA-FIKTIF-001",
  "fact_version_id": "NVA-FIKTIF-001.facts.v1",
  "question_pack_version_id": "NVA-FIKTIF-001.questions.v1",
  "status": "evidence_ready",

  "method_record": {
    "system": "OpenAI Responses API",
    "requested_model": "gpt-5.6-luna",
    "returned_model": "gpt-5.6-luna",
    "language": "id-ID",
    "location": { "country": "Indonesia", "city": "Bandung" },
    "web_search_required": true,
    "reasoning": "low",
    "method_version": "audit-method-v1",
    "instruction_version": "neutral-response-v1"
  },

  "run": {
    "started_at": "2026-08-17T02:10:00.000Z",
    "completed_at": "2026-08-17T02:20:00.000Z",
    "concurrency": 2,
    "support_recovery_used": false
  },

  "gate": { "total": 10, "evaluable": 10, "failed": 0, "passed": true },

  "observations": [ /* C.3 below */ ]
}
```

### C.3 The ten observations

```jsonc
[
  {
    "order": 1,
    "question": "Rekomendasikan tempat yang asik untuk ngopi dan WFC di Dago.",
    "classification": "tanpa_menyebut_bisnis_anda",
    "appearance_classification": "did_not_appear",
    "dimensions": { "appearance": "absent", "recommendation": "not_recommended", "comparison": "not_observed", "information": "not_assessed" },
    "run_status": "completed",
    "selected_observation": {
      "response_id": "resp-kts-01",
      "raw_answer": "Untuk ngopi dan WFC di Dago, Ruang Seduh dan Kopi Ruang Pagi adalah dua pilihan dengan Wi-Fi dan menu makanan.",
      "answer_excerpt": "Untuk ngopi dan WFC di Dago, Ruang Seduh dan Kopi Ruang Pagi adalah dua pilihan dengan Wi-Fi dan menu makanan.",
      "sources": [
        { "url": "https://ruangseduh.example/fasilitas", "title": "Ruang Seduh — fasilitas" },
        { "url": "https://kopiruangpagi.example/dago", "title": "Kopi Ruang Pagi — Dago" }
      ],
      "observed_at": "2026-08-17T02:10:30.000Z"
    },
    "attempts": [
      { "attempt": 1, "status": "completed", "started_at": "2026-08-17T02:10:30.000Z", "completed_at": "2026-08-17T02:10:34.000Z",
        "telemetry": { "requested_model": "gpt-5.6-luna", "returned_model": "gpt-5.6-luna", "response_id": "resp-kts-01", "latency_ms": 4100,
          "usage": { "input_tokens": 720, "cached_input_tokens": 0, "cache_write_input_tokens": 0, "output_tokens": 186, "reasoning_output_tokens": 0, "total_tokens": 906 },
          "web_search_calls": 1, "accounted_cost_usd": 0.0184, "cost_basis": "provider_usage", "pricing_version": "openai-responses-v1", "failure_reason": "" } }
    ]
  },
  {
    "order": 2,
    "question": "Tempat rapat kecil di Bandung yang ada makanan, minuman, dan bisa dipakai kerja di mana ya?",
    "classification": "tanpa_menyebut_bisnis_anda",
    "appearance_classification": "did_not_appear",
    "dimensions": { "appearance": "absent", "recommendation": "not_recommended", "comparison": "not_observed", "information": "not_assessed" },
    "run_status": "completed",
    "selected_observation": {
      "response_id": "resp-kts-02",
      "raw_answer": "Ruang Seduh mempublikasikan paket meeting untuk kelompok kecil di Bandung.",
      "answer_excerpt": "Ruang Seduh mempublikasikan paket meeting untuk kelompok kecil di Bandung.",
      "sources": [ { "url": "https://ruangseduh.example/meetings", "title": "Ruang Seduh — paket meeting" } ],
      "observed_at": "2026-08-17T02:11:00.000Z"
    },
    "attempts": [
      { "attempt": 1, "status": "completed", "started_at": "2026-08-17T02:11:00.000Z", "completed_at": "2026-08-17T02:11:05.000Z",
        "telemetry": { "requested_model": "gpt-5.6-luna", "returned_model": "gpt-5.6-luna", "response_id": "resp-kts-02", "latency_ms": 5200,
          "usage": { "input_tokens": 690, "cached_input_tokens": 0, "cache_write_input_tokens": 0, "output_tokens": 128, "reasoning_output_tokens": 0, "total_tokens": 818 },
          "web_search_calls": 1, "accounted_cost_usd": 0.0166, "cost_basis": "provider_usage", "pricing_version": "openai-responses-v1", "failure_reason": "" } }
    ]
  },
  {
    "order": 3,
    "question": "Kedai kopi apa aja di Dago yang cocok untuk WFC atau meeting?",
    "classification": "tanpa_menyebut_bisnis_anda",
    "appearance_classification": "mentioned_not_recommended",
    "dimensions": { "appearance": "mentioned", "recommendation": "not_recommended", "comparison": "not_observed", "information": "not_assessed" },
    "run_status": "completed",
    "selected_observation": {
      "response_id": "resp-kts-03",
      "raw_answer": "Pilihannya antara lain Ruang Seduh, Kopi Taman Senja, dan Kopi Ruang Pagi, tergantung kebijakan tempat duduk masing-masing.",
      "answer_excerpt": "Pilihannya antara lain Ruang Seduh, Kopi Taman Senja, dan Kopi Ruang Pagi, tergantung kebijakan tempat duduk masing-masing.",
      "sources": [
        { "url": "https://directory.example/dago-cafes", "title": "Direktori kafe Dago" },
        { "url": "https://kopitamansenja.example", "title": "Kopi Taman Senja" }
      ],
      "observed_at": "2026-08-17T02:11:30.000Z"
    },
    "attempts": [
      { "attempt": 1, "status": "completed", "started_at": "2026-08-17T02:11:30.000Z", "completed_at": "2026-08-17T02:11:36.000Z",
        "telemetry": { "requested_model": "gpt-5.6-luna", "returned_model": "gpt-5.6-luna", "response_id": "resp-kts-03", "latency_ms": 6100,
          "usage": { "input_tokens": 810, "cached_input_tokens": 0, "cache_write_input_tokens": 0, "output_tokens": 214, "reasoning_output_tokens": 0, "total_tokens": 1024 },
          "web_search_calls": 1, "accounted_cost_usd": 0.0212, "cost_basis": "provider_usage", "pricing_version": "openai-responses-v1", "failure_reason": "" } }
    ]
  },
  {
    "order": 4,
    "question": "Di mana ada cafe yang menyediakan kopi lokal dan bisa untuk kerja atau WFC di Bandung?",
    "classification": "tanpa_menyebut_bisnis_anda",
    "appearance_classification": "recommended",
    "dimensions": { "appearance": "mentioned", "recommendation": "recommended", "comparison": "not_observed", "information": "not_assessed" },
    "run_status": "completed",
    "selected_observation": {
      "response_id": "resp-kts-04",
      "raw_answer": "Kopi Taman Senja di Dago adalah salah satu pilihan untuk kopi lokal dan bekerja di siang hari.",
      "answer_excerpt": "Kopi Taman Senja di Dago adalah salah satu pilihan untuk kopi lokal dan bekerja di siang hari.",
      "sources": [ { "url": "https://kopitamansenja.example/menu", "title": "Kopi Taman Senja — menu" } ],
      "observed_at": "2026-08-17T02:12:00.000Z"
    },
    "attempts": [
      { "attempt": 1, "status": "completed", "started_at": "2026-08-17T02:12:00.000Z", "completed_at": "2026-08-17T02:12:05.000Z",
        "telemetry": { "requested_model": "gpt-5.6-luna", "returned_model": "gpt-5.6-luna", "response_id": "resp-kts-04", "latency_ms": 4700,
          "usage": { "input_tokens": 760, "cached_input_tokens": 0, "cache_write_input_tokens": 0, "output_tokens": 172, "reasoning_output_tokens": 0, "total_tokens": 932 },
          "web_search_calls": 1, "accounted_cost_usd": 0.0191, "cost_basis": "provider_usage", "pricing_version": "openai-responses-v1", "failure_reason": "" } }
    ]
  },
  {
    "order": 5,
    "question": "Bandingkan coffee shop di Bandung yang asik untuk kerja, harganya affordable, dan buka sampai malam.",
    "classification": "tanpa_menyebut_bisnis_anda",
    "appearance_classification": "mentioned_not_recommended",
    "dimensions": { "appearance": "mentioned", "recommendation": "not_recommended", "comparison": "competitor_preferred", "information": "not_assessed" },
    "run_status": "completed",
    "selected_observation": {
      "response_id": "resp-kts-05",
      "raw_answer": "Kopi Ruang Pagi mempublikasikan detail meeting yang lebih jelas, sementara Kopi Taman Senja mencantumkan makanan dan Wi-Fi tetapi detail reservasinya lebih sedikit.",
      "answer_excerpt": "Kopi Ruang Pagi mempublikasikan detail meeting yang lebih jelas, sementara Kopi Taman Senja mencantumkan makanan dan Wi-Fi tetapi detail reservasinya lebih sedikit.",
      "sources": [
        { "url": "https://kopiruangpagi.example/meetings", "title": "Kopi Ruang Pagi — meeting" },
        { "url": "https://kopitamansenja.example/fasilitas", "title": "Kopi Taman Senja — fasilitas" }
      ],
      "observed_at": "2026-08-17T02:13:00.000Z"
    },
    "attempts": [
      { "attempt": 1, "status": "completed", "started_at": "2026-08-17T02:13:00.000Z", "completed_at": "2026-08-17T02:13:07.000Z",
        "telemetry": { "requested_model": "gpt-5.6-luna", "returned_model": "gpt-5.6-luna", "response_id": "resp-kts-05", "latency_ms": 7200,
          "usage": { "input_tokens": 980, "cached_input_tokens": 0, "cache_write_input_tokens": 0, "output_tokens": 262, "reasoning_output_tokens": 0, "total_tokens": 1242 },
          "web_search_calls": 1, "accounted_cost_usd": 0.0260, "cost_basis": "provider_usage", "pricing_version": "openai-responses-v1", "failure_reason": "" } }
    ]
  },
  {
    "order": 6,
    "question": "Bandingin Kopi Taman Senja vs Kopi Ruang Pagi untuk WFC dan meeting di Dago.",
    "classification": "menyebut_bisnis_anda",
    "appearance_classification": "recommended",
    "dimensions": { "appearance": "mentioned", "recommendation": "recommended", "comparison": "client_preferred", "information": "not_assessed" },
    "run_status": "completed",
    "selected_observation": {
      "response_id": "resp-kts-06",
      "raw_answer": "Kopi Taman Senja lebih cocok untuk fokus kopi lokal, sementara Kopi Ruang Pagi mempublikasikan detail meeting yang lebih lengkap.",
      "answer_excerpt": "Kopi Taman Senja lebih cocok untuk fokus kopi lokal, sementara Kopi Ruang Pagi mempublikasikan detail meeting yang lebih lengkap.",
      "sources": [
        { "url": "https://kopitamansenja.example/menu", "title": "Kopi Taman Senja — menu" },
        { "url": "https://kopiruangpagi.example/meetings", "title": "Kopi Ruang Pagi — meeting" }
      ],
      "observed_at": "2026-08-17T02:14:00.000Z"
    },
    "attempts": [
      { "attempt": 1, "status": "completed", "started_at": "2026-08-17T02:14:00.000Z", "completed_at": "2026-08-17T02:14:06.000Z",
        "telemetry": { "requested_model": "gpt-5.6-luna", "returned_model": "gpt-5.6-luna", "response_id": "resp-kts-06", "latency_ms": 5900,
          "usage": { "input_tokens": 940, "cached_input_tokens": 0, "cache_write_input_tokens": 0, "output_tokens": 236, "reasoning_output_tokens": 0, "total_tokens": 1176 },
          "web_search_calls": 1, "accounted_cost_usd": 0.0242, "cost_basis": "provider_usage", "pricing_version": "openai-responses-v1", "failure_reason": "" } }
    ]
  },
  {
    "order": 7,
    "question": "Kopi Taman Senja bisa dipakai WFC atau kerja nggak ya? Kopi yang disediakan kopi apa?",
    "classification": "menyebut_bisnis_anda",
    "appearance_classification": "incomplete",
    "dimensions": { "appearance": "mentioned", "recommendation": "not_assessed", "comparison": "not_observed", "information": "incomplete" },
    "run_status": "completed",
    "selected_observation": {
      "response_id": "resp-kts-07",
      "raw_answer": "Kopi Taman Senja mencantumkan Wi-Fi dan kopi lokal, tetapi saya belum dapat memastikan ketersediaan stopkontak, kapasitas tempat duduk, atau kebijakan reservasi dari halaman resmi.",
      "answer_excerpt": "Kopi Taman Senja mencantumkan Wi-Fi dan kopi lokal, tetapi saya belum dapat memastikan ketersediaan stopkontak, kapasitas tempat duduk, atau kebijakan reservasi dari halaman resmi.",
      "sources": [ { "url": "https://kopitamansenja.example/fasilitas", "title": "Kopi Taman Senja — fasilitas" } ],
      "observed_at": "2026-08-17T02:15:00.000Z"
    },
    "attempts": [
      { "attempt": 1, "status": "completed", "started_at": "2026-08-17T02:15:00.000Z", "completed_at": "2026-08-17T02:15:06.000Z",
        "telemetry": { "requested_model": "gpt-5.6-luna", "returned_model": "gpt-5.6-luna", "response_id": "resp-kts-07", "latency_ms": 6400,
          "usage": { "input_tokens": 860, "cached_input_tokens": 0, "cache_write_input_tokens": 0, "output_tokens": 248, "reasoning_output_tokens": 0, "total_tokens": 1108 },
          "web_search_calls": 1, "accounted_cost_usd": 0.0230, "cost_basis": "provider_usage", "pricing_version": "openai-responses-v1", "failure_reason": "" } }
    ]
  },
  {
    "order": 8,
    "question": "Di mana alamat Kopi Taman Senja? Buka jam berapa?",
    "classification": "menyebut_bisnis_anda",
    "appearance_classification": "conflicting",
    "dimensions": { "appearance": "mentioned", "recommendation": "not_assessed", "comparison": "not_observed", "information": "conflicting" },
    "run_status": "completed",
    "selected_observation": {
      "response_id": "resp-kts-08",
      "raw_answer": "Situs resmi Kopi Taman Senja mencantumkan jam buka 08.00–21.00, sedangkan satu direktori mencantumkan 09.00–20.00. Konfirmasikan jam buka terkini langsung ke kafenya.",
      "answer_excerpt": "Situs resmi Kopi Taman Senja mencantumkan jam buka 08.00–21.00, sedangkan satu direktori mencantumkan 09.00–20.00.",
      "sources": [
        { "url": "https://kopitamansenja.example/visit", "title": "Kopi Taman Senja — kunjungi" },
        { "url": "https://maps.example/kopi-taman-senja", "title": "Simulasi Google Maps — Kopi Taman Senja" }
      ],
      "observed_at": "2026-08-17T02:16:00.000Z"
    },
    "attempts": [
      { "attempt": 1, "status": "completed", "started_at": "2026-08-17T02:16:00.000Z", "completed_at": "2026-08-17T02:16:05.000Z",
        "telemetry": { "requested_model": "gpt-5.6-luna", "returned_model": "gpt-5.6-luna", "response_id": "resp-kts-08", "latency_ms": 5300,
          "usage": { "input_tokens": 740, "cached_input_tokens": 0, "cache_write_input_tokens": 0, "output_tokens": 206, "reasoning_output_tokens": 0, "total_tokens": 946 },
          "web_search_calls": 1, "accounted_cost_usd": 0.0195, "cost_basis": "provider_usage", "pricing_version": "openai-responses-v1", "failure_reason": "" } }
    ]
  },
  {
    "order": 9,
    "question": "Cariin kontak Kopi Taman Senja.",
    "classification": "menyebut_bisnis_anda",
    "appearance_classification": "appeared",
    "dimensions": { "appearance": "mentioned", "recommendation": "not_assessed", "comparison": "not_observed", "information": "confirmed" },
    "run_status": "completed",
    "selected_observation": {
      "response_id": "resp-kts-09",
      "raw_answer": "Kopi Taman Senja mencantumkan nomor WhatsApp untuk pemesanan dan pertanyaan pada halaman kontaknya.",
      "answer_excerpt": "Kopi Taman Senja mencantumkan nomor WhatsApp untuk pemesanan dan pertanyaan pada halaman kontaknya.",
      "sources": [ { "url": "https://kopitamansenja.example/contact", "title": "Kopi Taman Senja — kontak" } ],
      "observed_at": "2026-08-17T02:17:00.000Z"
    },
    "attempts": [
      { "attempt": 1, "status": "completed", "started_at": "2026-08-17T02:17:00.000Z", "completed_at": "2026-08-17T02:17:03.000Z",
        "telemetry": { "requested_model": "gpt-5.6-luna", "returned_model": "gpt-5.6-luna", "response_id": "resp-kts-09", "latency_ms": 2800,
          "usage": { "input_tokens": 520, "cached_input_tokens": 0, "cache_write_input_tokens": 0, "output_tokens": 138, "reasoning_output_tokens": 0, "total_tokens": 658 },
          "web_search_calls": 1, "accounted_cost_usd": 0.0132, "cost_basis": "provider_usage", "pricing_version": "openai-responses-v1", "failure_reason": "" } }
    ]
  },
  {
    "order": 10,
    "question": "Kopi Taman Senja ada parkiran mobil dan mushollanya nggak?",
    "classification": "menyebut_bisnis_anda",
    "appearance_classification": "incomplete",
    "dimensions": { "appearance": "mentioned", "recommendation": "not_assessed", "comparison": "not_observed", "information": "incomplete" },
    "run_status": "completed",
    "selected_observation": {
      "response_id": "resp-kts-10",
      "raw_answer": "Kopi Taman Senja dikenali, tetapi ketersediaan parkiran mobil dan musholla belum tercantum di sumber resmi yang diperiksa.",
      "answer_excerpt": "Kopi Taman Senja dikenali, tetapi ketersediaan parkiran mobil dan musholla belum tercantum di sumber resmi yang diperiksa.",
      "sources": [
        { "url": "https://kopitamansenja.example/fasilitas", "title": "Kopi Taman Senja — fasilitas" },
        { "url": "https://maps.example/kopi-taman-senja", "title": "Simulasi Google Maps — Kopi Taman Senja" }
      ],
      "observed_at": "2026-08-17T02:18:00.000Z"
    },
    "attempts": [
      { "attempt": 1, "status": "completed", "started_at": "2026-08-17T02:18:00.000Z", "completed_at": "2026-08-17T02:18:06.000Z",
        "telemetry": { "requested_model": "gpt-5.6-luna", "returned_model": "gpt-5.6-luna", "response_id": "resp-kts-10", "latency_ms": 5800,
          "usage": { "input_tokens": 780, "cached_input_tokens": 0, "cache_write_input_tokens": 0, "output_tokens": 192, "reasoning_output_tokens": 0, "total_tokens": 972 },
          "web_search_calls": 1, "accounted_cost_usd": 0.0199, "cost_basis": "provider_usage", "pricing_version": "openai-responses-v1", "failure_reason": "" } }
    ]
  }
]
```

### C.4 Historical derived report arithmetic (pre-Spec 007)

This subsection is retained for the frozen pre-Spec 007 fixture record. It is
not the arithmetic or composition for the current V1 journey.

| Measure | Value |
|---|---|
| Overall appearance (business mentioned in retained answer) | **8 / 10** |
| **Tanpa menyebut bisnis Anda** (Q1–Q5) | **3 / 5** |
| **Menyebut bisnis Anda** (Q6–Q10) | **5 / 5** |
| Recommendation (assessed) | 2 recommended of 6 assessed |
| Comparison (assessed) | 1 client-preferred of 2 assessed |
| Public information (assessed) | 1 confirmed, 2 incomplete, 1 conflicting of 4 assessed |

This is the historical arithmetic 06 reproduced from the frozen evidence; the
fixture carries the answers, the report computes the counts. The `8/10` here is
the historical result of the 5/5 composition and chosen outcomes. It must not
be used to define current V1 denominators: Spec 007 uses the fixed 6/4 matrix.

---

## Reconciliation against current code (not a code change)

These fixtures define the **new Indonesian contract** fields from the
`docs/journey` plans. They do **not** conform one-to-one to the current English
schema in `src/lib/audit/types.ts`:

- Current `BusinessBrief` requires `verified_competitor` (non-optional) and
  fixes `language: "en-US"`. Fixture A makes the comparison business optional
  and the language `id-ID`.
- The pre-A3 historical `PromptPack` fixed `en-US`,
  `target_product: "ChatGPT"`, and a 5/5 matrix with
  `review_status: "needs_human_review"`. Fixture B adds a customer
  `edit_record`, dynamic final classification, and an approval timestamp. The
  current V1 pack follows Spec 007's fixed 6/4 matrix instead.
- Current `AuditObservation` has `run_status`, `telemetry`, and `sources` but no
  final classification, `appearance_classification`, `attempts` list, or
  `dimensions` object. Fixture C is a superset that adds them.

Resolving those differences (new versioned schemas vs. extending the current
ones) was an *implementation-specification* decision for the orchestrator, not
something this fixture document resolves. This document freezes the *data*
handoffs so the modules can develop in parallel; the code that reads them is
specified separately.

**Orchestrator resolution (2026-08-17, Spec 002 open question 5):** the new
Indonesian handoff records sit **beside** the current English types — additive
and versioned. `src/lib/audit/fixtures/fixture-kopi-taman-senja.ts` implements
the frozen chain with small additive types in that module; the existing English
schemas and the 208-test audit baseline are untouched.

## Out of scope

- Any code or fixture change (including `report-golden.ts`).
- The current Spec 007 question-pack model, including its fixed 6/4 composition
  and wording-only editing contract.
- Technical-failure evidence sets (the `9/10`, retry, and recovery paths).
- The current Spec 007 comparison-target fallback; this historical fixture has
  no such case.
- Report language (final Indonesian report copy is a separate, later review).
- PDF, delivery email, access/recovery (07), or payment (02) records.

## Escalated product decisions

1. **Cross-document fiction is inconsistent — RESOLVED (orchestrator decision,
   2026-08-17).** `03`'s simulation uses opening hours 08.00–21.00 vs
   09.00–20.00 and comparison business **Kopi Ruang Pagi**; `06`'s English
   sample used 08:00–22:00 vs 09:00–22:00 and named **Kopi Purnama** as the
   comparator. Decision: the frozen fixture chain is the implementation source
   of truth and adopts `03`'s values canonically — comparison business **Kopi
   Ruang Pagi** and the hours pair **08.00–21.00** (official website) vs
   **09.00–20.00** (directory). The `06` sample's values are superseded, and
   this draft's residual **Kopi Purnama** traces in evidence observations 01,
   03, and 05 were reconciled to **Kopi Ruang Pagi** on 2026-08-17 so the whole
   chain names one comparison business. Evidence observations 07 and 08 were
   also reconciled so the retained answers literally name **Kopi Taman Senja**.
   This preserves the historical branded appearance count at 5/5 under the
   visible-appearance rule required by AC-11; it is not the current V1 model.
2. **Final Indonesian report copy is not yet approved** (`06` settled decision
   #10). The fixtures store Indonesian raw answers, but 06 cannot finalize
   customer-facing report text until that language decision lands. This does
   not block building 06 against the frozen evidence, only the wording.
3. **Schema reconciliation — RESOLVED (orchestrator decision, Spec 002 open
   question 5).** The new Indonesian handoff records sit **beside** the current
   English `BusinessBrief` / `PromptPack` / `AuditObservation` types — additive
   and versioned. The frozen chain is implemented in
   `src/lib/audit/fixtures/fixture-kopi-taman-senja.ts` with small additive
   types in that module, so the 208-test audit baseline stays green.

## Verification record

- Verification artifact for this historical fixture: `src/lib/audit/fixtures/fixture-kopi-taman-senja.ts`
  (frozen chain module: `NVA-FIKTIF-001.facts.v1` → `questions.v1` →
  `evidence.v1`) and `src/lib/audit/fixtures/fixture-kopi-taman-senja.test.ts`
  (unit tests: 10/10 evaluable with no failed test, appearance counts exactly
  8/10 / 3/5 / 5/5, question distinctness and no identity leakage,
  no unsupported-premise wording, `.example`-only source URLs, reconciled
  fiction fields)
- Result: All fixture tests pass; the pre-existing 208-test audit baseline
  stays green (`npm run test:audit`).
- Date: 2026-08-17
