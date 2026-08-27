# Dependabot Package

> [!WARNING]
> This project is experimental and not ready for use.

The Dependabot package runs manifest-aware dependency maintenance from a private Central Agentic Ops control repository. It prioritizes security and repair work, selects target repositories, and dispatches one bounded updater per repository.

The Agentic Workflow definitions remain in the control repository. Target repositories receive only declared safe outputs; they do not receive installed copies of these workflows.

## What It Does

- Prioritizes repositories with dependency alerts, stale or conflicted update pull requests, lockfile drift, and actionable Dependabot configuration failures.
- Understands relationships among manifests, lockfiles, workspaces, solutions, source code, tests, and CI instead of grouping updates only by package name.
- Builds the smallest independently testable dependency bundle supported by repository evidence.
- Produces at most one primary dependency-maintenance outcome per worker workflow run.
- Never auto-merges a pull request.

## Package Contents

| Workflow | Role |
| --- | --- |
| [`dependabot`](../.github/workflows/dependabot.md) | Daily orchestrator workflow that discovers, ranks, and selects repositories. |
| [`dependabot-release-train-updater`](../.github/workflows/dependabot-release-train-updater.md) | Repository-scoped worker workflow that proposes or repairs one reviewable dependency bundle. |

The orchestrator workflow can dispatch no more than 50 worker workflows in one run. Each worker workflow handles one target repository and uses only its declared pull request, comment, issue, or `noop` safe outputs.

## Install

Install the package into a new private control repository owned by an organization:

```bash
gh aw add-wizard githubnext/central-agentic-ops/dependabot@<catalog-release>
```

The installer configures authentication and creates the package controls. The package is immediately runnable in `review` mode.

## Configure

Configure a GitHub App, a fine-grained PAT, or both in the control repository for private targets, alternate review repositories, or live operation. App authentication is preferred. A bounded review run against a public target can use the automatically provided `GITHUB_TOKEN` when outputs stay in the private control repository.

| Setting | Type | Required | Purpose |
| --- | --- | --- | --- |
| `GH_AW_GITHUB_APP_ID` | Repository variable | With App authentication | GitHub App client ID. |
| `GH_AW_GITHUB_APP_PRIVATE_KEY` | Repository secret | With App authentication | GitHub App private key. |
| `GH_AW_GITHUB_TOKEN` | Repository secret | For cross-repository access without a complete App configuration | Fine-grained PAT fallback; not required for public targets reviewed in the control repository. |
| `CENTRAL_AGENTIC_OPS_ALLOWED_OWNERS` | Repository variable | No | Comma-separated permitted owners; defaults to the control repository owner. |
| `CENTRAL_AGENTIC_OPS_MAX_SCAN_REPOS` | Repository variable | No | Bounded discovery size; defaults to `1000` and cannot exceed `100000`. |
| `CENTRAL_AGENTIC_OPS_CELL_COUNT` / `CENTRAL_AGENTIC_OPS_CELL_INDEX` | Repository variables | No | Deterministically select one inventory cell; defaults to cell `0` of `1`. |
| `CENTRAL_AGENTIC_OPS_BATCH_SIZE` / `CENTRAL_AGENTIC_OPS_BATCH_INDEX` | Repository variables | No | Select one bounded batch within the cell; defaults to batch `0` with size `100000`. |
| `CENTRAL_AGENTIC_OPS_DEPENDABOT_ENABLED` | Repository variable | No | Package kill switch; defaults to `true`. Set to `false` to stop orchestrator and worker dispatches. |
| `CENTRAL_AGENTIC_OPS_DEPENDABOT_MODE` | Repository variable | No | Package output mode: `review` or `live`. Defaults to `review`. |
| `CENTRAL_AGENTIC_OPS_DEPENDABOT_MAX_REPOS` | Repository variable | No | Scheduled selection cap; defaults to `1`. |
| `CENTRAL_AGENTIC_OPS_DEPENDABOT_ROLLOUT_PERCENT` | Repository variable | No | Percentage of discovered repositories eligible for selection. Accepts `1` through `100` and defaults to `100`. |
| `CENTRAL_AGENTIC_OPS_DEPENDABOT_UPDATER_ENABLED` | Repository variable | No | Worker kill switch; defaults to `true`. |
| `CENTRAL_AGENTIC_OPS_DEPENDABOT_UPDATER_MAX_MODE` | Repository variable | No | Worker mode ceiling; defaults to `review`. |
| `CENTRAL_AGENTIC_OPS_MAX_AI_CREDITS_PER_RUN` | Repository variable | No | Aggregate orchestration ceiling; defaults to `1100`. |
| `GH_AW_CI_TOKEN` | Repository secret | Optional | Supports the updater path that requires an additional empty commit. |

The App installation or PAT must cover every private or internal target, alternate review repository, and live target the package needs to read or update. Public review runs may use `GITHUB_TOKEN`, but unavailable target Actions, security, or Dependabot data makes the run incomplete rather than broadening access or guessing. See the [authentication guide](../docs/authentication.md) for the permission model and credential precedence.

## Validate in review mode

Start with one representative repository:

1. Open the generated **Dependabot** workflow in the control repository's **Actions** tab.
2. Select **Run workflow**.
3. Set `target_repo` to one fully qualified `owner/repository` name.
4. Keep `max_repos` at `1` and `safe_output_mode` at `review`.
5. Trigger a `workflow_dispatch` run and inspect repository selection, the dispatched worker workflow, review outputs in the control repository, and control-plane correlation data.

To keep scheduled runs in review, set the package variable explicitly:

```bash
gh variable set CENTRAL_AGENTIC_OPS_DEPENDABOT_MODE \
	--body review \
	--repo OWNER/CONTROL_REPOSITORY
```

Changing the variable affects future runs. Cancel active runs separately when changing mode during incident response.

## Promote the Package

| Mode | Behavior |
| --- | --- |
| `review` | Routes safe outputs to the control-plane repository; manual runs may override it with `safe_output_repo`. |
| `live` | Allows declared safe outputs to update the selected target repository. Pull requests remain unmerged. |

Promote in order: one-repository review, limited live, then scheduled live. Change only this package's mode variable; other Central Agentic Ops packages keep their own rollout state.

## Targeting

A manual `target_repo` can address a fully qualified repository only when its owner is allowlisted and the configured credential can access it. Without an explicit target, bounded automatic discovery enumerates repositories in the organization that owns the control repository. Enterprise-wide automatic discovery across multiple organizations is not provided.

The orchestrator favors:

1. Critical or high security alerts with a known patched version.
2. Broken, stale, conflicted, or duplicated dependency update work.
3. Lower-severity security updates with a clear path to a safer state.
4. Dependabot, registry, toolchain, grouping, or permissions repairs.
5. Routine compatible patch and minor maintenance.

Repositories without a recognized dependency ecosystem, readable manifests, or enough evidence for a safe change are skipped.

## Safety Boundaries

- GitHub tools are read-only; mutations occur only through declared safe outputs.
- The orchestrator workflow selects repositories but does not mutate them directly.
- A worker workflow receives one target and cannot discover more repositories, dispatch another workflow, or promote its mode.
- Pull request safe outputs are draft, branch- and file-constrained, and limited to one per worker workflow run.
- The worker workflow can update an eligible dependency pull request, add bounded comments, create bounded follow-up issues, or emit `noop`.
- Credentials remain in the private control repository and are never included in dispatch inputs.

## Pause or Stop

Set `CENTRAL_AGENTIC_OPS_DEPENDABOT_ENABLED` to `false` and cancel active runs. Re-enable in `review` mode after resolving the incident. For a narrower worker-only stop, use `CENTRAL_AGENTIC_OPS_DEPENDABOT_UPDATER_ENABLED`. For a control-plane-wide stop, follow the [emergency-stop procedure](../docs/operations.md#emergency-stop).

## More Information

- [Configuration reference](../docs/configuration.md)
- [Rollout and safe output routing](../docs/rollout-and-routing.md)
- [Control architecture](../docs/architecture.md)
- [Operations and incident response](../docs/operations.md)
