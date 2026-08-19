# Domain transition plan: v1 SaaS → v0.2 report tool

> Written: 2026-08-16
> For: an implementor agent
> Status: founder-approved decisions below; execution not started

## Goal

`nuave.ai` currently serves the v1 AI-visibility-tracker SaaS (landing, auth,
webapp). After this transition:

| URL | Serves |
| --- | --- |
| `nuave.ai` + `www.nuave.ai` | the v0.2 report tool (this repo) |
| `monitor.nuave.ai` | the v1 SaaS, unchanged and still working |

Nothing is deleted. The v1 codebase, Vercel project, database, and auth keep
running — they just answer on a different hostname.

## Founder decisions (do not re-litigate)

1. **Old site moves to `monitor.nuave.ai`.** Not `app.`, not `old.`.
2. **No real users on v1.** Migration can be mechanical. Still update auth
   callback URLs so the old site keeps working, but no user comms needed.
3. **Apex serves the v0.2 landing + a working report tool**, gated by an access
   code. The code is handed out manually by the founder.
4. **Ship `src/app/page.tsx` as it is.** No copy rewrite in this task. Landing
   copy drafts in the repo root are out of scope.
5. **301-redirect old v1 paths** from the apex to `monitor.nuave.ai`.

## Constraints

- v0.2 has **never been deployed**. First deploy is part of this task.
- The report tool makes **real paid API calls**. It must not be reachable
  without the access code, and the existing per-session USD ceiling must stay on.
- Order of operations matters. `nuave.ai` must never point at nothing.

---

## Phase 0 — Pre-flight (no changes yet)

1. Confirm in Vercel: which project owns `nuave.ai` and `www.nuave.ai` today.
   Record the project name.
2. Confirm where DNS is managed — Vercel nameservers, or an external registrar
   (Cloudflare, Namecheap, etc.). Record it.
3. Lower the TTL on the apex and `www` records to 300s if DNS is external.
   Wait for the old TTL to expire before Phase 3.
4. In the v1 repo, list every route the public could have hit. At minimum look
   for: `/login`, `/signup`, `/register`, `/dashboard`, `/settings`, `/pricing`,
   `/features`, `/blog`, `/api/*`. Write the list into a scratch file — Phase 4
   needs it.
5. In the v1 repo/Vercel env, find every place `nuave.ai` is hardcoded:
   `NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL`, Supabase/Clerk/Auth.js redirect
   allowlists, OAuth provider callback URLs, email templates, cookie domain.
   Write that list down too.

**Gate:** you can name the v1 Vercel project, the DNS host, the v1 route list,
and the v1 absolute-URL list. Do not proceed otherwise.

---

## Phase 1 — Give the old site its new home (zero risk)

The old site becomes reachable at *both* hostnames. Nothing breaks.

1. In the v1 Vercel project → Domains → add `monitor.nuave.ai`.
2. Add the DNS record Vercel asks for (CNAME `monitor` → `cname.vercel-dns.com`,
   or the ALIAS/A it specifies).
3. Update the v1 absolute URLs found in Phase 0 step 5 to `monitor.nuave.ai`:
   env vars, OAuth callback allowlists, auth provider redirect URLs.
   Redeploy v1.
4. If a cookie domain is pinned to `.nuave.ai`, scope it to `monitor.nuave.ai`
   so v1 sessions never leak onto the new apex.

**Verify:** open `https://monitor.nuave.ai` — v1 landing loads. Sign up, log in,
log out, load the dashboard. All work. `nuave.ai` still serves v1 too. Good.

---

## Phase 2 — Deploy v0.2 and build the gate (still zero risk)

The apex is untouched throughout this phase. All work happens on Vercel's
generated preview URL.

### 2a. First deploy

1. Create a new Vercel project from `github.com/yasir-mukhtar/nuave_v0.2`,
   `main` branch. Framework: Next.js. Node 22 (`.nvmrc`).
2. Set env vars in Vercel (Production + Preview), from `.env.example`:
   - `OPENAI_API_KEY` — required, server-only
   - `OPENAI_AUDIT_MODEL` — `gpt-5.6-luna`
   - `NUAVE_PROVIDER` — leave blank for the paid OpenAI path
   - `NUAVE_FIXTURE_PREVIEW_ENABLED` — `true` (landing links to
     `/audit/fixture`; leave it on so the demo journey works)
   - `NUAVE_FIXTURE_FORCE_REPORT_FAILURE` — leave blank
   - `OPENAI_AUDIT_CARRYOVER_COST_USD` — leave blank
   - `NUAVE_ACCESS_CODE` — new; see 2b. Pick a non-guessable string.
   Do not add any `NEXT_PUBLIC_` variant of these.
3. Deploy. Confirm the build passes and the landing renders on the
   `*.vercel.app` URL.

### 2b. Access-code gate

There is no gate in the repo today — only the server-side
`NUAVE_FIXTURE_PREVIEW_ENABLED` flag, which is a different thing. Build the
smallest gate that works:

- Add `src/middleware.ts` with a matcher covering `/audit/:path*` and
  `/api/audit/:path*`. Leave `/` public.
- The middleware reads an httpOnly cookie (e.g. `nuave_access`) and compares it
  to `process.env.NUAVE_ACCESS_CODE`. Match → continue. No match → redirect page
  requests to `/access`, and return `401` JSON for `/api/audit/*`.
- Add `src/app/access/page.tsx`: one input, one submit. A route handler or
  server action compares the submitted code to `NUAVE_ACCESS_CODE`, and on match
  sets the cookie — `httpOnly`, `secure`, `sameSite: lax`, ~30-day expiry — then
  redirects to `/audit`. On mismatch, show a plain "kode tidak sesuai" state.
- Never send `NUAVE_ACCESS_CODE` to the client and never read it in a client
  component.

Copy for `/access` is Indonesian and minimal. Do not build accounts, email, or
rate limiting — out of scope.

### 2c. Verify on the preview URL

- `/` loads publicly.
- `/audit` while logged out → redirects to `/access`.
- `/api/audit/run` with no cookie → `401`, and **no API call is made**. Confirm
  via the response and by checking there is no spend.
- Correct code → `/audit` loads; the workflow runs end to end and produces a
  report.
- Wrong code → rejected, no cookie set.
- `/audit/fixture` runs the simulated journey without any audit API call.
- `npm run check` and `npm run test:audit` pass.

**Gate:** every check above passes on the preview URL. Do not touch DNS
otherwise.

---

## Phase 3 — The flip

This is the only step with downtime risk. It takes about two minutes.

1. In the **v1** Vercel project → Domains → remove `nuave.ai` and
   `www.nuave.ai`. (`monitor.nuave.ai` stays.)
2. In the **v0.2** Vercel project → Domains → add `nuave.ai` and
   `www.nuave.ai`. Set `www` to redirect to the apex.
3. Wait for the certificate to issue.

**Verify:** `nuave.ai` serves the v0.2 landing. `www.nuave.ai` redirects to it.
`monitor.nuave.ai` still serves v1 and its auth still works.

**Rollback:** remove the two domains from the v0.2 project and re-add them to
v1. One minute, no code changes. This is why v1 is never modified beyond its
URL config.

---

## Phase 4 — Redirect the old paths

The apex now belongs to v0.2, so these redirects live in **this** repo, in
`next.config.ts`.

Using the Phase 0 route list, add permanent redirects to `nextConfig`:

```ts
async redirects() {
  return [
    { source: "/login",     destination: "https://monitor.nuave.ai/login",     permanent: true },
    { source: "/signup",    destination: "https://monitor.nuave.ai/signup",    permanent: true },
    { source: "/dashboard/:path*", destination: "https://monitor.nuave.ai/dashboard/:path*", permanent: true },
    // …one entry per v1 route found in Phase 0
  ];
}
```

Rules:

- Redirect only paths v1 actually owned. Never add a catch-all `/:path*` — it
  would swallow `/audit`, `/access`, and everything v0.2 needs.
- Never redirect `/`, `/audit`, `/audit/fixture`, `/access`, or `/api/audit/*`.
- If a v1 path collides with a v0.2 path, v0.2 wins; drop the redirect and note
  the collision.

Deploy and verify each redirect returns 301 to the right `monitor.nuave.ai` URL,
and that `/audit` and `/access` are untouched.

---

## Phase 5 — Verification pass

Run the whole list once, on production, and record the result:

- [ ] `nuave.ai` → v0.2 landing, HTTPS valid
- [ ] `www.nuave.ai` → redirects to apex
- [ ] `monitor.nuave.ai` → v1 landing; signup, login, dashboard all work
- [ ] Every Phase 4 redirect returns 301 to the correct target
- [ ] `nuave.ai/audit` with no cookie → `/access`
- [ ] `nuave.ai/api/audit/run` with no cookie → 401, no spend
- [ ] With the code: a full audit runs and renders a report
- [ ] `nuave.ai/audit/fixture` runs with zero audit API calls
- [ ] `NUAVE_ACCESS_CODE` and `OPENAI_API_KEY` appear nowhere in the client
      bundle (`view-source` and a build-output grep)
- [ ] The per-session USD ceiling still enforces
- [ ] `robots.txt` / sitemap on the apex does not still advertise v1 routes

Then update `docs/NOW.md`: v0.2 is deployed at `nuave.ai` behind an access code,
v1 lives at `monitor.nuave.ai`.

---

## Out of scope

Do not do these as part of this task:

- rewriting landing copy, or merging any `Archive Candidates/landing-copy-drafts/` draft
- public rate limiting, accounts, payment, or checkout
- changing v1 features, database, or design
- deleting the v1 repo, project, or data
- translating the audit workflow to Indonesian (tracked separately in `NOW.md`)
- SEO work beyond the 301s

## Known open risk

The report tool ships publicly before the report-quality gate in
[`END_TO_END_PLAN.md`](./END_TO_END_PLAN.md) has been passed. The access code is
what keeps this honest: no stranger reaches the tool, and spend stays bounded by
the per-session ceiling. If the code leaks, rotate `NUAVE_ACCESS_CODE` in Vercel
and redeploy — that invalidates every issued cookie.
