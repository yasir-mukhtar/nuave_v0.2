# Spec 010 verification

## AC-10 — Workers runtime (R-10a)

`npm run test:workers` runs locally: it generates request payloads with the
app's own intake helpers (`scripts/test-workers-payloads.ts`, bundled by
esbuild), builds with `opennextjs-cloudflare build`, then serves the real
bundle under `wrangler dev` (workerd, local mode — no network, no provider
calls). The rate-limit bindings from `wrangler.jsonc` are live inside the
worker; provider hosts are never contacted because `NUAVE_AUDIT_MODE` is
`synthetic`. It is not wired into `npm run verify` because that gate must stay
hermetic for CI; this script is the documented local equivalent.

Run on `codex/spec010-public-flow`, 2026-09-19 (block 4 working tree):

    PASS  payloads generated from the app intake helpers
    PASS  opennextjs-cloudflare build
    PASS  switch off: /audit shows the unavailable UI — status 200
    PASS  switch off: /api/audit/run → 404 before any work — status 404
    PASS  legacy method omitted: /api/audit/run → 400 — status 400
    PASS  legacy method canonical: /api/audit/run → 400 — status 400
    PASS  legacy method glm-slots: /api/audit/run → 400 — status 400
    PASS  legacy method unknown: /api/audit/run → 400 — status 400
    PASS  legacy method glm-slots: /api/audit/glm-questions → 400 — status 400
    PASS  legacy method canonical: /api/audit/glm-questions → 400 — status 400
    PASS  legacy method canonical: /api/audit/report → 400 — status 400
    PASS  archived route /api/audit/prompts → 404 — status 404
    PASS  archived route /api/audit/variance → 404 — status 404
    PASS  archived route /api/audit/local-audit → 404 — status 404
    PASS  archived route /audit/v2 → 404 — status 404
    PASS  glm-questions: two synthetic generations succeed — statuses 200/200
    PASS  glm-questions: third call inside 60s → 429 (binding active in workerd) — status 429
    PASS  synthetic direct-ten run completes with ten observations — events 22
    PASS  synthetic report request succeeds — status 200
    PASS  no filesystem access attempted in workerd

    Workers runtime check passed — 20 checks green.

The production route table from the same build confirms the archive (only the
five retained `/api/audit/*` routes plus `/audit` and the `/audit/new-intake`
redirect exist — `/audit/v2`, `/audit/fixture`, `/audit/spec004`,
`/audit/local-report`, `/api/audit/prompts`, `/api/audit/variance` and
`/api/audit/local-audit` are gone):

    Route (app)
    ┌ ○ /
    ├ ○ /_not-found
    ├ ƒ /api/audit/extract
    ├ ƒ /api/audit/glm-questions
    ├ ƒ /api/audit/identity
    ├ ƒ /api/audit/report
    ├ ƒ /api/audit/run
    ├ ƒ /audit
    ├ ƒ /audit/new-intake
    ├ ○ /faq
    ├ ○ /privacy
    ├ ○ /robots.txt
    ├ ○ /sitemap.xml
    ├ ○ /support
    └ ○ /terms

## AC-11 — one authorized live run (masryef.com, 2026-09-20)

Authorized scope: one live extraction, one GLM generation, ten observations,
one report. Executed against `https://v2.nuave.ai/audit` on the deployed
worker (direct OpenAI, `gpt-5.6-luna`, Responses API + hosted web search).
Raw request/response captures: `.secrets/spec010-masryef-live-2026-09-20/`
(git-ignored evidence).

### Outcome

Report generated successfully (HTTP 200, `resp_0a588757…`, 11.5 s,
$0.0094). `accuracy_status: no_clear_issues`; conclusion (Bahasa):
Masryef was not found or recommended in any of the ten tested answers —
recorded as an unmet visibility opportunity, not a permanent result.
All ten observations carry `system: "OpenAI Responses API"`,
requested/returned model `gpt-5.6-luna`, `run_status: completed`,
non-empty response IDs, and passed the execute-time protected invariant
(including ≥1 real web-search call each).

### Confirmed provider calls and cost

| Stage | Calls | Cost (USD) |
|---|---|---|
| Extraction (extract) | 8 | 0.11838 |
| GLM question generation | 3 | 0.00128 |
| Observations (direct-ten run) | 10 | 0.15238 |
| Report synthesis | 1 | 0.00938 |
| **Total** | **22** | **0.28142** |

### Pre-provider rejections (0 calls, $0)

- `POST /api/audit/identity` 503 at 02:46 — provider gate rejected
  `NUAVE_PROVIDER=openai` before any provider work (fixed by PR #69).
- `POST /api/audit/glm-questions` at 03:52 — workerd fetch threw on
  `redirect: "error"` before the provider call (fixed by PR #70).
- `POST /api/audit/extract` 403 at 04:38 — per-IP rate limit.
- `POST /api/audit/report` 422 at 04:47 — provenance gate still pinned to
  the OpenCode Go system label (fixed by PR #71). The same captured
  request body was replayed after deploy and produced the report above;
  the report stage therefore consumed exactly one provider call.

### Honest overrun note

The authorization scoped one extraction and one GLM generation. Repeated
driver restarts during production bug-fixing re-ran intake, producing
8 extractions and 3 GLM attempts (one GLM attempt returned HTTP 200 with
an unparseable line — a real billed call — followed by one explicit
user-confirmed retry). No second observation run and no second report
call were made. Overrun: 7 extractions + 2 GLM attempts ≈ $0.11.

### Fixes shipped during this run

- PR #69 — provider gates admit `openai` in production.
- PR #70 — GLM live transport `redirect: "manual"` for workerd.
- PR #71 — protected observation method approves `OpenAI Responses API`
  alongside OpenCode Go, rejects mixed-system sets; execute-time
  invariant applies to OpenAI.
