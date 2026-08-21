# Rollout and safe output Routing

## Bundle-Level Control

Each bundle has its own mode. Review safe outputs route to the current control-plane repository unless a manual run supplies `safe_output_repo`. This is the primary unit of gradual rollout.

| Bundle | Mode variable | Scheduled absolute cap | Rollout percentage variable |
| --- | --- | --- | --- |
| Dependabot | `CENTRAL_AGENTIC_OPS_DEPENDABOT_MODE` | `CENTRAL_AGENTIC_OPS_DEPENDABOT_MAX_REPOS` | `CENTRAL_AGENTIC_OPS_DEPENDABOT_ROLLOUT_PERCENT` |
| Optimization | `CENTRAL_AGENTIC_OPS_OPTIMIZATION_MODE` | `CENTRAL_AGENTIC_OPS_OPTIMIZATION_MAX_REPOS` | `CENTRAL_AGENTIC_OPS_OPTIMIZATION_ROLLOUT_PERCENT` |

Changing one bundle does not change another. For example, Dependabot may be live while Optimization remains in review.

Absolute caps default to `1`, so missing configuration cannot create broad fan-out. Rollout percentages accept integers from `1` through `100` and default to `100`. The control plane rounds the percentage-derived repository count up for a non-empty candidate set, then applies the smallest of that count, `max_repos`, and the target count supported by the declared dispatch budget and eligible worker count. For example, a `10` percent rollout over 25 discovered repositories permits at most 3 selections before stricter caps are applied. Invalid values fail closed.

Automatic discovery scans at most `CENTRAL_AGENTIC_OPS_MAX_SCAN_REPOS` repositories, defaulting to `1000` with a hard maximum of `10000`. Manual target and review repositories must belong to `CENTRAL_AGENTIC_OPS_ALLOWED_OWNERS`, which defaults to the control repository owner.

## Modes

| Mode | Target behavior | Intended use |
| --- | --- | --- |
| `staged` | staged mode generates safe outputs without GitHub API writes | Initial validation, prompt inspection, and policy testing |
| `review` | safe outputs route to the current control-plane repository, with an optional manual `safe_output_repo` override | Human review of proposed effects before target mutation |
| `live` | Declared worker workflow safe outputs may write to the selected target | Production operation after promotion gates pass |

staged mode is the installation default. Review mode resolves its destination from the manual `safe_output_repo` workflow input, then `github.repository`. Legacy `preview` configuration is normalized to `staged` during migration.

In review mode, the review repository is not treated as a clone of the target. When a target-bound mutation cannot be represented natively against the review repository, the worker should publish an artifact-backed review bundle describing the target, intended output primitive, base branch, and supporting evidence.

## Pages Report Routing

Pages report routing follows the control-plane modes. Deployment is still conventional deterministic GitHub Actions automation, but the effective mode selects whether there is no site update, an access-controlled review site update, or a production site update.

| Mode | Report source behavior |
| --- | --- |
| `staged` | Proposed report source data is staged and is not input to the published site. |
| `review` | Proposed report source data is routed to the private `safe_output_repo` and published to its access-controlled review Pages site. Production Pages is unchanged. |
| `live` | Declared report source data is written to its normal durable destination and published to the production Pages site. |

The review and production publishers use fixed trusted source locations and build code and accept no agent-generated build commands, paths, repository names, or site bundles through dispatch inputs. They should use separate build and deploy jobs. The build job needs `contents: read` and its own `pages: write` permission for `actions/configure-pages`; the deploy job independently needs `pages: write` plus `id-token: write` and deploys through a protected environment. Agents do not receive those permissions or authority to change the routed mode.

For Pages reports, `safe_output_repo` retains its standard meaning as the safe-output review destination and also owns the review Pages deployment. It must be private, Pages-enabled, and access-controlled for the intended reviewers. Review and production use distinct repositories or protected environments, URLs, and concurrency groups. If access-controlled review Pages is unavailable, review publication fails closed rather than publishing publicly or falling back to a different output channel.

## `workflow_dispatch` Runs

A `workflow_dispatch` run can set the `target_repo`, `max_repos`, `rollout_percent`, `safe_output_mode`, and `safe_output_repo` workflow inputs. These DispatchOps runs are useful for a controlled canary or incident diagnosis. They do not update repository variables or another bundle's policy, and their requested mode does not depend on the configured scheduled mode.

`workflow_dispatch` runs should narrow scope during validation:

- specify one `target_repo`;
- keep `max_repos` at `1`;
- use `staged` first;
- use the control-plane repository for scheduled review runs, and use `safe_output_repo` only when a manual run needs a private override;
- do not use a manual live run to bypass failed promotion gates.

## Promotion Plan

Promote each bundle independently:

1. **Installed but inactive**: credentials and repository access are configured; schedules must not produce writes.
2. **Staged**: run against one representative repository and inspect selection, prompts, staged safe outputs, permissions, and correlation data.
3. **Review**: route one representative repository to a private review destination; verify that no target mutation occurs and the proposal is actionable. For a Pages report, also verify that the access-controlled review site updates and production Pages does not.
4. **Limited live**: manually target one low-risk repository; verify the resulting safe output and downstream CI. For a Pages report, verify the production site update independently of the review site.
5. **Scheduled live**: enable scheduled operation with `max_repos` kept small, then increase limits only from observed evidence.

Promotion evidence should cover successful authentication, correct target selection, safe output routing, no unexpected writes, worker workflow completion, useful safe output quality, and acceptable AI Credit consumption.

## Rollback

The first rollback action is to move the affected bundle to `staged`. For a narrower incident, disable the affected worker workflow so precomputation marks it ineligible. Then:

1. stop new dispatches;
2. inspect the orchestrator run and correlated worker runs;
3. close, revert, or supersede unintended safe outputs using normal repository procedures;
4. if a workflow or package release caused the incident, restore its last known-good Git revision, compile every affected workflow, and deploy that revision through the normal reviewed change process;
5. otherwise, correct the affected policy or worker behavior and compile every affected workflow;
6. restart in staged mode and repeat promotion gates.

Do not reduce another bundle's mode unless the incident involves shared authentication or shared control behavior.
