# Prepared direct-ten GLM request — NOT SENT, NOT AUTHORIZED

Prepared 2026-09-18 under Spec 009 Block A. This is the exact request the
founder checkpoint must review before authorizing one new generation call.
The business context below is the **fictional Laundry Ceria fixture**
(`INTAKE_FIXTURES.GLM`), used for offline plumbing only. **The live request
is NOT READY**: real founder business context is still pending, and this
fixture is not authorization. Do not send this body.

## Status

| Item | State |
|---|---|
| Request built | Yes — [request.json](./request.json), byte-identical pipeline output |
| Business context | Fictional fixture — see [business-input.json](./business-input.json) |
| Founder live-context confirmation | **Pending** — request must be rebuilt from the confirmed real intake |
| Live authorization | **Not granted** — all prior allowances consumed |
| Credential read | None — no key was read or stored |
| Prior consumed request/marker | Untouched — the 2026-09-17 artifacts are preserved |

## Exact request

- Endpoint (when authorized): `https://api.cheaperinference.com/v1/chat/completions`
- Model: `glm-5.3-flash`
- `stream: false`, `max_tokens: 4096`, `reasoning_effort: "low"`
- Client wait: 180,000 ms (`AbortSignal.timeout`), redirect: error
- Client retries: **zero** — one request per authorized attempt, atomic
  consume before send; transport itself never retries
- Auth: `Bearer ${CHEAPERINFERENCE_API_KEY}` read from server env at send
  time only; live mode additionally requires `NUAVE_GLM_LIVE_AUTHORIZED`

## Hashes and sizes

| Artifact | SHA-256 | Size |
|---|---|---|
| Recovered source body (verbatim) | `652cfeda5cb6b11fa08d33f80325854738fdaacd8f0f59b3533ae0ad0cf71d0a` | 11,228 chars |
| Assembled instruction (adapted + amendments) | `e78403b52bb5f247619d1ee07e2fff37e9fddc1ef6a4624cf9e06be0b5941eb1` | — |
| Minimized writer brief (fixture) | `88cb7e2f8e6a913c6dd92fa8ab55c4f963d91787485d80d95fa5700ef671a031` | 794 chars |
| Request body, compact JSON (send form) | `fce81baf68e2d03c90daa012ea53496a5642f9832ce1416ab3919f7e2e84a40e` | 13,821 bytes |
| request.json, pretty-printed file | `4aa0774c61b8ea5d03e7f7c1ab9ea82f74a07f0a32d61a2bb537621f93f10118` | — |
| Single user message | — | 13,162 chars |

The compact-body hash is what `frozen-request.sha256` binds at freeze time.

## Adaptation diff (exact)

The instruction is the verbatim recovered body with only these changes:

1. `Then generate **12 candidate consumer questions.**` →
   `Then generate **10 consumer questions.**` (ten is the workload; no
   selection pool, so "candidate" is dropped).
2. The `## 2. Candidate questions` sample block is replaced by the concrete
   numbered-line contract the strict extractor reads (lines 1–10 in order,
   optional `Intent pattern:` label per question, no other text). Section
   names and order are unchanged.
3. `[PASTE SAMPLE BRAND INFORMATION HERE]` → the one minimized confirmed
   brief (replaces per-slot contexts; placeholder substituted once).
4. Founder amendments appended verbatim after a `---` divider: the
   2026-09-16 no-quota amendment (repeated needs permitted; no
   distinct-needs quota) and the 2026-09-18 delivery terms (all ten
   questions unnamed — no audited brand, alias, or supplied comparator).

Nothing else was edited: no fixed roles, no named questions, no required
competitor, no 6/4 composition, no per-slot context, no punctuation proxy.
The market-interpretation and self-critique sections remain provider-side
analysis, preserved for inspection and never shipped as customer questions.

## Estimated cost

Assumption: observed 2026-09-17 billing — USD 0.000371 settled for 3,848
total tokens (2,684 prompt + 1,164 completion). The new message is ~13.2k
chars (~3.4–3.7k prompt tokens by the same rough ratio) and `max_tokens`
is unchanged at 4,096. Expected settled cost: **≈ USD 0.0004–0.0008** for
one call — same order as the captured call. Exact billing arrives only in
`cheaper_inference.billing.billed_cost_usd` after a real send.

## Exact next founder test

1. Confirm the real business/public context (the fixture is a placeholder).
2. Rebuild the request from the confirmed intake; re-verify the source-body
   hash and re-record the request hash.
3. Authorize exactly one live call (freeze → single send → raw response
   preserved to owner-only evidence).
4. Review the ten returned texts in the local UI; edit/approve or flag
   concrete problems — the human quality gate stays.

## Honest limits

- The synthetic stub proves plumbing only — it says nothing about live
  question naturalness.
- A `zai/`-prefixed returned model keeps the mismatch verdict inspectable;
  it is not identity acceptance.
- No live call, retry, credential read, or production activation occurred.
