# Autonomous implementation in Devin Desktop

Run a bounded approved Nuave plan slice from one parent session:

```text
Use the nuave-autonomous skill against <approved spec path>,
slice <named scope or acceptance criteria>. Continue through implementation,
independent review, in-scope fixes, offline verification, and a ready PR.
Stop at a real blocker or the skill's call limit. Do not merge or deploy.
```

The reusable instructions are in
[nuave-autonomous](../.agents/skills/nuave-autonomous/SKILL.md). This is an
instruction-driven local workflow, not an installed daemon, scheduler, or
Dynamic Workflow runtime. The existing
[spec template](./templates/SPEC.md) already supplies scope, requirements,
constraints, failure behavior, acceptance criteria and non-goals. The parent
adds exact tests and bounded worker briefs using
[the existing handoff template](./templates/WORKER_PROMPT.md).

## What this mode supports

One active parent owns decomposition, technical decisions, GitHub follow-up,
and the selected slice's completion. A worker implements in its own worktree;
a different agent reviews a fixed commit in another worktree. The parent
routes fixes and waits for supported child completion notifications. It does
not depend on unrelated open Desktop conversations waking each other.

Default to sequential work and at most three worker/reviewer cycles (six
child dispatches for the whole selected slice). Children consume usage;
this bound is not a hard spending cap. A changed PR head needs a new verdict,
including commits from Devin Review Auto-Fix. The finish line is a reviewed
PR with green required CI. Merge and deployment retain the repository's
founder-authorization rule.

## Preflight for each machine/session

- Confirm repository read/push and PR access with the configured GitHub account.
  Work from fetched `origin/main` in a dedicated feature worktree; preserve
  existing branches, edits and active writers.
- Use Node 22 and the lockfile (`npm ci`). `npm run verify` is the offline gate.
  Customer-visible journey work also needs the applicable synthetic browser
  evidence; use the existing `verify-nuave` skill.
- Confirm an implementation worker and a separate reviewer are available.
  The local `mia` profile is one option when installed; it is not bundled by
  this skill. A worker alone cannot produce independent acceptance.
- Confirm needed tools are permitted. Foreground children can surface approval
  requests; background children cannot obtain missing permissions. A skill
  does not override those controls. This package grants no blanket shell
  permissions and changes no account preferences.
- Keep the local host and parent session available during a run. Supported
  interruptions/resume can preserve state, but saved files do not wake idle
  Desktop sessions. Validate the checkpoint before resuming interrupted work.

## Cloud and Dynamic Workflows

The public Dynamic Workflows documentation describes a managed runtime with
structured outputs and resumable execution. Discover its skill and runtime
in the actual session before selecting it. If unavailable, use the disclosed
local mode; a copied `workflow.py` cannot create the missing runtime.

In a session/account where the runtime is available, check the documented
Dynamic Workflows enablement and workflow/child-session approval preferences.
These are separate from local Desktop tool permissions. Cloud repository
setup, account preferences, hard usage limits, automatic triggers, and
Devin Review Auto-Fix must be checked through their supported surfaces;
installing this skill does not configure or verify them. Local Git access
also does not prove that a Cloud VM can clone or push.

Start with one small real slice, inspect the branch handoff, independent
verdict, repair behavior, CI and actual usage, then repeat before scheduling
unattended jobs or increasing concurrency. Report a documentation review or
simulated protocol test as such; neither proves a real coding run completed
without intervention. Never claim Step 28 of the broader rollout merely
because the skill is installed.

## Sources

- [Devin Local in Desktop](https://docs.devin.ai/desktop/devin-local)
- [CLI skills](https://docs.devin.ai/cli/extensibility/skills/overview)
- [CLI subagents](https://docs.devin.ai/cli/subagents)
- [Dynamic Workflows](https://docs.devin.ai/work-with-devin/dynamic-workflows)
- [Devin Review](https://docs.devin.ai/work-with-devin/devin-review)
- [Nuave workflow and evidence rules](./WORKFLOW.md)
