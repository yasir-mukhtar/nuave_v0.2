# R-22 · SSRF feasibility determination — Cloudflare Workers

> Status: **Complete** · Date: 2026-08-30
> Required by `SPEC.md` R-22 before implementation planning.
> Method: runtime documentation and repository configuration. **No Worker was
> deployed and no live fetch was executed** — see §7 for what that leaves open.

## 1 · The question

R-22 asks whether the naive SSRF pattern — resolve the hostname, validate the
returned IP, then fetch — delivers its intended property on this runtime. It
does not, because a second resolution at fetch time can return a different
address. The mitigation is normally **DNS pinning**: fetch the validated IP
directly and carry the original hostname in the `Host` header and TLS SNI.

Is pinning achievable on Cloudflare Workers?

## 2 · Verdict

**No. Pinning is not achievable through `fetch()`, and the workaround that
could achieve it is disproportionate to the risk on this deployment.**

Two independent blocks:

1. **`fetch()` exposes no DNS control.** There is no `lookup` hook, no resolver
   override, and no way to bind a request to a pre-resolved address.
2. **`fetch()` refuses a literal IP.** A URL whose host is an IP address fails
   with **error 1003, "Direct IP access not allowed."** So even resolving the
   hostname ourselves and fetching the address does not work — the technique
   the pin depends on is unavailable on its own terms.

`connect()` from `cloudflare:sockets` *can* target a specific address, and is
the only path to a genuine pin. Taking it means writing HTTP/1.1 by hand over a
raw socket: request framing, response parsing, chunked transfer decoding, TLS
via `startTls()`, redirect handling, and header limits — replacing one
`fetch()` call. The documentation does not confirm that `connect()` accepts a
raw IP as `hostname`, and does not document supplying a custom TLS servername
when it does, so the approach is not merely expensive but unproven.

## 3 · What this deployment actually is

From the repository, not from assumption:

| Fact | Source |
|---|---|
| Cloudflare Workers via OpenNext | `wrangler.jsonc`, `open-next.config.ts`, `@opennextjs/cloudflare` |
| `compatibility_date` 2026-08-01, flags `["nodejs_compat"]` | `wrangler.jsonc` |
| **The only binding is `ASSETS`** | `wrangler.jsonc` |
| No Workers VPC, no Hyperdrive, no Tunnel, no Durable Objects, no KV | `wrangler.jsonc` |

## 4 · What the runtime does and does not give us

**Given by the platform, at no cost to us:**

- A literal-IP URL is refused outright (error 1003). Every direct-to-address
  SSRF attempt fails before our code matters.
- `connect()` blocks localhost, private network ranges, and Cloudflare IP
  ranges at the runtime level, and blocks port 25.
- Reaching a private or internal service from a Worker requires a **Workers VPC
  binding**. This Worker has none, so there is no configured route into any
  private network.
- Workers is not a virtual machine. There is **no instance metadata service** —
  the `169.254.169.254` prize that motivates most SSRF work does not exist here.
  Secrets are environment bindings, not fetchable over HTTP.

**Not given, and not obtainable through `fetch()`:**

- Pinning a request to a validated address.
- Any guarantee about what happens when a hostname passes validation and then
  resolves to a private address at fetch time.

## 5 · The residual risk, stated honestly

After R-22's controls, what remains on *this* deployment is **not privilege
escalation**. There is no internal network to pivot into, no metadata service,
and no binding reachable from a URL. The realistic residual is:

1. **DNS rebinding to a private address.** A hostname that validates, then
   resolves to private space at fetch time. On this deployment the attacker
   reaches Cloudflare's own refusal or nothing useful — there is no configured
   private route. Unverified rather than proven safe (§7).
2. **Nuave used as an unauthenticated fetch proxy.** An attacker submits
   arbitrary public URLs and Nuave fetches them, obscuring their origin and
   spending Nuave's CPU and bandwidth. **This is the real exposure**, and it is
   an abuse-and-cost problem, not a confidentiality one. It is R-23's to bound.

## 6 · Decision

**Do not build a pinned fetch for V1.** Ship `fetch()` with the full R-22
control set applied as pre-flight validation and per-hop revalidation, and
record the DNS-rebinding residue as accepted, on these grounds:

- The naive pattern's failure mode is reaching an internal service. This
  deployment has none, and Cloudflare will not route a Worker into private
  space without a VPC binding it does not have.
- The alternative is a hand-written HTTP/TLS client on an undocumented socket
  path, whose own bug surface is plausibly larger than the risk it removes.
- The exposure that *is* real — open-proxy abuse — is addressed by R-23, not by
  pinning.

**Revisit when** any of these becomes true: a Workers VPC, Tunnel, or Hyperdrive
binding is added; the endpoint is opened to untrusted third-party callers rather
than Nuave's own funnel; or the fetched content starts being rendered or
executed rather than parsed for metadata.

## 7 · What was not verified

Recorded so no one mistakes this for a tested result.

1. **Whether Workers `fetch()` refuses a hostname that resolves to a private or
   reserved address.** Not documented, not tested. This is the single fact that
   would convert §5.1 from *accepted* to *closed*.
2. Whether `connect()` accepts a raw IP as `hostname`, and whether a custom TLS
   servername can be supplied. Not needed given §6, but it is what a future pin
   would rest on.

**The cheap check that closes item 1:** deploy a throwaway route that fetches a
hostname whose DNS A record points at `127.0.0.1`, and record the error. One
deploy, no provider cost, no customer exposure. Worth doing before the identity
endpoint carries real traffic; not a blocker for implementation planning.

## Sources

- [TCP sockets · Cloudflare Workers](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/)
- [Announcing `connect()` — a new API for creating TCP sockets from Workers](https://blog.cloudflare.com/workers-tcp-socket-api-connect-databases/)
- [Error 1003 · Cloudflare](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1003)
- [Workers VPC — troubleshooting](https://developers.cloudflare.com/workers-vpc/reference/troubleshooting)
- [workerd issue 93 — allow fetch to use IP address](https://github.com/cloudflare/workerd/issues/93)
- [Rate limiting binding · Cloudflare Workers](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
