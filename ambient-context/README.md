# Ambient Context Bundle

> [!WARNING]
> This project is experimental and not ready for use.

The Ambient Context bundle maintains the ambient context that agents read before every task: a repository's `AGENTS.md` and its agent skills. It ships in the core Central Agentic Ops package and can also be installed on its own.

The Agentic Workflow definitions remain in the control repository. Target repositories receive only declared safe outputs; they do not receive installed copies of these workflows.

Ambient context decays quietly. Directories move, commands change, reviewers repeat the same correction, and the always-loaded instruction file keeps growing until it costs more than it helps. This bundle runs on a weekly-or-slower cadence, finds the repositories whose instructions have drifted the most, and files one issue per repository containing the evidence and a ready-to-run agentic prompt that applies a small, verifiable change.

## Scope Rule

**A repository without a root `AGENTS.md` is out of scope.** The orchestrator skips it and the workers stop before creating anything. This bundle maintains ambient context that already exists; it never proposes creating it.

## What It Does

- Selects repositories where `AGENTS.md` has drifted from repository reality.
- Verifies the instruction file against the default branch: referenced paths that no longer exist, documented commands that are no longer defined, directories deleted since the file last changed, and build or test tooling that changed afterwards.
- Detects contradictions between instruction files — for example `AGENTS.md` documenting one package manager while `CLAUDE.md` or the committed lockfile says another. A contradiction is worse than an omission, because an agent may follow either branch.
- Flags residue that needs no interpretation: unresolved `TODO`/`FIXME` markers, year references that contradict current reality, and prose version claims that disagree with the manifests.
- Reads merged pull request and review-comment history, weighting corrections repeated on agent-authored pull requests, because a repeated correction is direct evidence of a missing or ignored rule.
- Keeps the file small. Ambient context is loaded into every session, so the bundle prefers deleting, compressing, and de-duplicating over adding, and targets under 200 lines and under 10 KB.
- Routes content it removes to the cheapest destination that still guarantees it loads when needed: a nested `AGENTS.md` or path-scoped instructions file for directory-specific rules, a skill for procedures, and config or CI for rules a check can enforce deterministically.
- Recommends moving multi-step procedures out of `AGENTS.md` into skills, sharpening skill descriptions so agents can select them correctly, and flagging skills that look abandoned.
- Defers when an open pull request is already modifying an instruction file, so proposals never race an in-flight change.
- Produces at most one issue per worker run, each containing an agentic prompt with an explicit file allowlist, per-edit evidence, a size budget, and an instruction to skip any edit whose evidence no longer holds.

Both workers are read-only. They never edit a repository, never open a pull request, and never merge anything. A human or a coding agent decides whether to run the prompt.

## Bundle Contents

| Workflow | Role |
| --- | --- |
| [`ambient-context`](../.github/workflows/ambient-context.md) | Weekly orchestrator workflow that discovers, ranks, and selects repositories with drifting ambient context. |
| [`ambient-context-agents-md-curator`](../.github/workflows/ambient-context-agents-md-curator.md) | Repository-scoped worker workflow that audits `AGENTS.md` and files one issue with an agentic update prompt. |
| [`ambient-context-skills-curator`](../.github/workflows/ambient-context-skills-curator.md) | Repository-scoped worker workflow that audits skills and `AGENTS.md` layering and files one issue with an agentic skills prompt. |

The orchestrator workflow can dispatch no more than 20 worker workflows in one run, shared across both workers.

## Install

The bundle is part of the core package, so installing Central Agentic Ops installs it:

```bash
gh aw add-wizard githubnext/central-agentic-ops@<catalog-release>
```

To install only this bundle into an existing private control repository:

```bash
gh aw add githubnext/central-agentic-ops/ambient-context@<catalog-release>
```

The bundle is left in `staged` mode. Configure `CENTRAL_AGENTIC_OPS_AMBIENT_CONTEXT_MODE` before it can act.

## Configure

| Setting | Type | Required | Purpose |
| --- | --- | --- | --- |
| `CENTRAL_AGENTIC_OPS_AMBIENT_CONTEXT_MODE` | Repository variable | Yes | Bundle mode: `staged`, `review`, or `live`. Defaults to `staged`. |
| `CENTRAL_AGENTIC_OPS_AMBIENT_CONTEXT_MAX_REPOS` | Repository variable | No | Scheduled selection cap; defaults to `1`. |
| `CENTRAL_AGENTIC_OPS_AMBIENT_CONTEXT_ROLLOUT_PERCENT` | Repository variable | No | Percentage of discovered repositories eligible for selection. Accepts `1` through `100` and defaults to `100`. |
| `CENTRAL_AGENTIC_OPS_AMBIENT_CONTEXT_AGENTS_MD_ENABLED` | Repository variable | No | `AGENTS.md` curator kill switch; defaults to `true`. |
| `CENTRAL_AGENTIC_OPS_AMBIENT_CONTEXT_AGENTS_MD_MAX_MODE` | Repository variable | No | `AGENTS.md` curator mode ceiling; defaults to `staged`. |
| `CENTRAL_AGENTIC_OPS_AMBIENT_CONTEXT_SKILLS_ENABLED` | Repository variable | No | Skills curator kill switch; defaults to `true`. |
| `CENTRAL_AGENTIC_OPS_AMBIENT_CONTEXT_SKILLS_MAX_MODE` | Repository variable | No | Skills curator mode ceiling; defaults to `staged`. |

Shared control-plane settings — `GH_AW_GITHUB_APP_ID`, `GH_AW_GITHUB_APP_PRIVATE_KEY`, `GH_AW_GITHUB_TOKEN`, `CENTRAL_AGENTIC_OPS_ALLOWED_OWNERS`, `CENTRAL_AGENTIC_OPS_MAX_SCAN_REPOS`, cell and batch variables, and `CENTRAL_AGENTIC_OPS_MAX_AI_CREDITS_PER_RUN` — behave exactly as they do for the core bundles. See the [configuration reference](../docs/configuration.md) and the [authentication guide](../docs/authentication.md).

## Validate in staged mode

1. Open the generated **Ambient Context** workflow in the control repository's **Actions** tab.
2. Select **Run workflow**.
3. Set `target_repo` to one fully qualified `owner/repository` name that has a root `AGENTS.md`.
4. Keep `max_repos` at `1` and `safe_output_mode` at `staged`.
5. Inspect repository selection, the dispatched workers, the staged issue bodies, and the agentic prompts they contain before promoting the bundle.

Repeat with a repository that has no `AGENTS.md` and confirm that it is reported as skipped and that no worker produces an issue.

## Promote the Bundle

| Mode | Behavior |
| --- | --- |
| `staged` | Safe outputs are generated without GitHub API writes. |
| `review` | Issues are routed to the control-plane repository; manual runs may override it with `safe_output_repo`. |
| `live` | Issues are created in the selected target repository. |

Promote in order: one-repository staged, private review, limited live, then scheduled live.

## Cadence

The orchestrator is scheduled weekly. Ambient context should not be rewritten more often than the repository changes, and a weekly-or-slower pass matched with a per-repository issue that expires after 30 days keeps proposals fresh without creating maintenance noise. Slow the schedule further by lowering `CENTRAL_AGENTIC_OPS_AMBIENT_CONTEXT_ROLLOUT_PERCENT` or `CENTRAL_AGENTIC_OPS_AMBIENT_CONTEXT_MAX_REPOS`.

## Safety Boundaries

- GitHub tools are read-only; the only mutation is one issue per worker run.
- The orchestrator selects repositories and does not curate anything itself.
- A worker receives one target, cannot discover more repositories, cannot dispatch another workflow, and cannot promote its mode.
- Every proposed edit must cite evidence; unsupported suggestions are dropped.
- Repositories without a root `AGENTS.md` are skipped rather than bootstrapped.
- Repository content is untrusted input, never policy.

## Pause or Stop

Set `CENTRAL_AGENTIC_OPS_AMBIENT_CONTEXT_MODE` to `staged` to put future scheduled runs in staged mode. Clearing the mode stops scheduled selection and worker dispatch. For a control-plane-wide stop, follow the [emergency-stop procedure](../docs/operations.md#emergency-stop).

## More Information

- [Configuration reference](../docs/configuration.md)
- [Rollout and safe output routing](../docs/rollout-and-routing.md)
- [Control architecture](../docs/architecture.md)
- [Operations and incident response](../docs/operations.md)
