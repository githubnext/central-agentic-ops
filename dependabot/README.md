# Dependabot Bundle

> [!WARNING]
> This project is experimental and not ready for use.

The Dependabot bundle runs manifest-aware dependency maintenance from a private Central Agentic Ops control repository. It prioritizes security and repair work, selects target repositories, and dispatches one bounded updater per repository.

The workflow definitions remain in the control repository. Target repositories receive only declared safe outputs; they do not receive installed copies of these workflows.

<p align="center">
	<img src="../docs/assets/dependabot-bundle-flow.svg" alt="Dependabot bundle flow from control-plane trigger through repository-scoped safe outputs">
</p>

## What It Does

- Prioritizes repositories with dependency alerts, stale or conflicted update pull requests, lockfile drift, and actionable Dependabot configuration failures.
- Understands relationships among manifests, lockfiles, workspaces, solutions, source code, tests, and CI instead of grouping updates only by package name.
- Builds the smallest independently testable dependency bundle supported by repository evidence.
- Produces at most one primary dependency-maintenance outcome per worker run.
- Never auto-merges a pull request.

## Bundle Contents

| Workflow | Role |
| --- | --- |
| [`dependabot`](../.github/workflows/dependabot.md) | Daily orchestrator that discovers, ranks, and selects repositories. |
| [`dependabot-release-train-updater`](../.github/workflows/dependabot-release-train-updater.md) | Repository-scoped worker that proposes or repairs one reviewable dependency bundle. |

The orchestrator can dispatch no more than 50 workers in one run. Each worker handles one target repository and uses only its declared pull request, comment, issue, or no-op safe outputs.

## Install

Install the bundle into a new private control repository owned by an organization:

```bash
gh aw add-wizard githubnext/central-agentic-ops/dependabot@<catalog-release>
```

The installer configures authentication and creates the bundle controls. It leaves the bundle in `preview` mode.

## Configure

Configure a GitHub App, a fine-grained PAT, or both in the control repository. App authentication is preferred.

| Setting | Type | Required | Purpose |
| --- | --- | --- | --- |
| `GH_AW_GITHUB_APP_ID` | Repository variable | With App authentication | GitHub App client ID. |
| `GH_AW_GITHUB_APP_PRIVATE_KEY` | Repository secret | With App authentication | GitHub App private key. |
| `GH_AW_GITHUB_TOKEN` | Repository secret | Without a complete App configuration | Fine-grained PAT fallback. |
| `CENTRAL_AGENTIC_OPS_DEPENDABOT_MODE` | Repository variable | Yes | Bundle mode: `preview`, `review`, or `live`. Defaults to `preview`. |
| `CENTRAL_AGENTIC_OPS_DEPENDABOT_REVIEW_REPO` | Repository variable | In `review` mode | Private review destination in `owner/repository` form. |
| `GH_AW_CI_TOKEN` | Repository secret | Optional | Supports the updater path that requires an additional empty commit. |

The App installation or PAT must cover every target and review repository the bundle needs to read or update. See the [authentication guide](../docs/authentication.md) for the permission model and credential precedence.

## Validate in Preview

Start with one representative repository:

1. Open the generated **Dependabot** workflow in the control repository's **Actions** tab.
2. Select **Run workflow**.
3. Set `target_repo` to one fully qualified `owner/repository` name.
4. Keep `max_repos` at `1` and `safe_output_mode` at `preview`.
5. Run the workflow and inspect repository selection, the dispatched updater, staged safe outputs, and control-plane correlation data.

To keep scheduled runs in preview, set the bundle variable explicitly:

```bash
gh variable set CENTRAL_AGENTIC_OPS_DEPENDABOT_MODE \
	--body preview \
	--repo OWNER/CONTROL_REPOSITORY
```

Changing the variable affects future runs. Cancel active runs separately when changing mode during incident response.

## Promote the Bundle

| Mode | Behavior |
| --- | --- |
| `preview` | Stages safe outputs without mutating the target repository. |
| `review` | Routes proposals to the configured private review repository. Missing review configuration prevents dispatch. |
| `live` | Allows declared safe outputs to update the selected target repository. Pull requests remain unmerged. |

Promote in order: one-repository preview, private review, limited live, then scheduled live. Change only this bundle's mode variable; other Central Agentic Ops bundles keep their own rollout state.

## Targeting

A manual `target_repo` can address any fully qualified repository that the configured credential can access. Without an explicit target, current automatic discovery enumerates repositories in the organization that owns the control repository. Enterprise-wide automatic discovery across multiple organizations requires an explicit inventory or a future discovery extension.

The orchestrator favors:

1. Critical or high security alerts with a known patched version.
2. Broken, stale, conflicted, or duplicated dependency update work.
3. Lower-severity security updates with a clear path to a safer state.
4. Dependabot, registry, toolchain, grouping, or permissions repairs.
5. Routine compatible patch and minor maintenance.

Repositories without a recognized dependency ecosystem, readable manifests, or enough evidence for a safe change are skipped.

## Safety Boundaries

- GitHub tools are read-only; mutations occur only through declared safe outputs.
- The orchestrator selects repositories but does not mutate them directly.
- A worker receives one target and cannot discover more repositories, dispatch another workflow, or promote its mode.
- Pull requests are draft, branch- and file-constrained, and limited to one per worker run.
- The worker can update an eligible dependency pull request, add bounded comments, create bounded follow-up issues, or return a no-op.
- Credentials remain in the private control repository and are never included in dispatch inputs.

## Pause or Stop

Set `CENTRAL_AGENTIC_OPS_DEPENDABOT_MODE` to `preview` to stage future scheduled outputs. Clearing the mode or using an unrecognized value stops scheduled selection and dispatch, but it does not prevent an authorized manual run.

For a Dependabot-only stop, disable the generated Dependabot orchestrator or updater workflow in GitHub Actions and cancel active runs. For a control-plane-wide stop, follow the [emergency-stop procedure](../docs/operations.md#emergency-stop).

## More Information

- [Configuration reference](../docs/configuration.md)
- [Rollout and output routing](../docs/rollout-and-routing.md)
- [Control architecture](../docs/architecture.md)
- [Operations and incident response](../docs/operations.md)
