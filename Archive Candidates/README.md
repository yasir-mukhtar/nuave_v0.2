# Archive candidates

> Status: **Staging area — awaiting a founder decision.** Nothing here is
> authoritative or active.
> Staged: 2026-08-19 (repository reorganization)

## What this folder is

Material that looks superseded, completed, or duplicated, moved out of the
active surface so the repository reads clearly — but **not** yet folded into
[`../archive/`](../archive/) and **not** deleted.

Each item below is waiting on one decision: **archive it, restore it, or delete
it.** After the decision, an item moves into `../archive/` under the matching
subdirectory (and gains that directory's protections), or comes back to the
active tree, or goes away.

This folder is excluded from `tsconfig.json` and `eslint.config.mjs`, so nothing
here is type-checked, linted, or built.

## Contents

| Path | Came from | Why it was staged | Decision needed |
|---|---|---|---|
| `lp-remote/` | `LP-remote/` (root) | A second, complete Next.js app. Its landing components were merged into `src/` (commit `9ce1d01`) and have since diverged. It was still being type-checked by `npm run check`. | Archive, or state what still needs merging |
| `lp-claude-static/` | `LP - Claude/` (root) | Static HTML content-first landing draft (`index`, `-v2`, `-v3`). Declared out of scope by `docs/V2_SUBDOMAIN_LAUNCH_PLAN.md`. | Archive, or promote its copy into `docs/content/landing-copy.md` |
| `faq-taste-preview/` | `faq-taste-preview/` (root) | Static FAQ design preview against the external taste-system repo. The live page is `src/app/faq/page.tsx`. | Archive, or fold its design decisions into the design pass |
| `landing-copy-drafts/landing-copy-backup.md` | `Landing Page Copy Backup.md` (root) | Undated backup of an earlier landing copy revision. | Archive |
| `landing-copy-drafts/landing-copy-claude.md` | `Landing Page Copy - Claude.md` (root) | Alternative landing copy draft. | Archive |
| `landing-copy-drafts/landing-copy-chatgpt-v0.3.md` | `Landing Page Copy - ChatGPT.md` (root) | Alternative landing copy draft, self-labelled v0.3. Carries `[BRACKET]` slots that were never filled. | Archive, or harvest specific sections into the winner |
| `completed-plans/HANDOFF_LP_REPLACE.md` | `docs/HANDOFF_LP_REPLACE.md` | One-shot handoff written "for the next agent continuing the task". The task landed. | Archive |
| `completed-plans/V2_SUBDOMAIN_LAUNCH_PLAN.md` | `docs/V2_SUBDOMAIN_LAUNCH_PLAN.md` | Executed in full: `https://v2.nuave.ai` is live on Cloudflare Workers with the access gate and CI verified. Founder confirmed done 2026-08-19; the facts it established now live in `docs/NOW.md`. | **Decided — archive** |
| `superseded-plans/DOMAIN_TRANSITION_PLAN.md` | `docs/DOMAIN_TRANSITION_PLAN.md` | Targeted serving the apex `nuave.ai` from this repository with the v1 SaaS moved to `monitor.nuave.ai`. The `v2.` subdomain route shipped instead. Founder superseded it 2026-08-19. | **Decided — archive** |
| `superseded-voice/voice-candidate-2026-08-10.md` | `docs/drafts/VOICE.md` | v1 voice candidate. Explicitly superseded by canonical `docs/VOICE.md`. | Archive |
| `superseded-voice/voice-v2-candidate-2026-08-17.md` | `docs/drafts/VOICE-v2-candidate.md` | v2 voice candidate. Promoted into canonical `docs/VOICE.md` on 2026-08-17 (Spec 002 R-24/R-25). | Archive |

`Landing Page Copy.md` was **kept**, not staged. It is the winning landing copy
source and now lives at [`../docs/content/landing-copy.md`](../docs/content/landing-copy.md).

## Decisions already taken

The two domain plans were resolved by the founder on 2026-08-19 and recorded in
[`../docs/DECISION_LOG.md`](../docs/DECISION_LOG.md): the v2 subdomain launch is
**complete**, and the apex domain transition is **superseded**. Both are staged
here and can be folded into `../archive/` whenever the archive is next tidied.

Everything else in the table above is still waiting on a decision.

## Cross-references

Documents that referred to staged material now point at these paths. Those
references were repaired mechanically during the move; their surrounding wording
has not been rewritten and may still describe the material as active.
