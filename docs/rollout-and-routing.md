# Rollout and Output Routing

## Bundle-Level Control

Each bundle has its own mode and private review destination. This is the primary unit of gradual rollout.

| Bundle | Mode variable | Review repository variable |
| --- | --- | --- |
| Dependabot | `CENTRAL_AGENTIC_OPS_DEPENDABOT_MODE` | `CENTRAL_AGENTIC_OPS_DEPENDABOT_REVIEW_REPO` |
| Optimization | `CENTRAL_AGENTIC_OPS_OPTIMIZATION_MODE` | `CENTRAL_AGENTIC_OPS_OPTIMIZATION_REVIEW_REPO` |

Changing one bundle does not change another. For example, Dependabot may be live while Optimization remains in review.

## Modes

| Mode | Target behavior | Intended use |
| --- | --- | --- |
| `preview` | Safe outputs are staged and do not mutate the target | Initial validation, prompt inspection, and policy testing |
| `review` | Outputs are routed to an explicit private review repository | Human review of proposed effects before target mutation |
| `live` | Declared worker safe outputs may write to the selected target | Production operation after promotion gates pass |

Preview is the installation default. Review mode requires a non-empty review repository. If it is missing, shared control selects no targets, dispatches no workers, and reports the incomplete configuration.

In review mode, the review repository is not treated as a clone of the target. When a target-bound mutation cannot be represented natively against the review repository, the worker should publish an artifact-backed review bundle describing the target, intended output primitive, base branch, and supporting evidence.

## Manual Overrides

A manual dispatch can set `target_repo`, `max_repos`, `safe_output_mode`, and `safe_output_repo` for that run. Overrides are useful for a controlled canary or incident diagnosis. They do not update repository variables or another bundle's policy.

Manual overrides should narrow scope during validation:

- specify one `target_repo`;
- keep `max_repos` at `1`;
- use `preview` first;
- provide a private review repository before selecting `review`;
- do not use a manual live run to bypass failed promotion gates.

## Promotion Plan

Promote each bundle independently:

1. **Installed but inactive**: credentials and repository access are configured; schedules must not produce writes.
2. **Preview**: run against one representative repository and inspect selection, prompts, staged outputs, permissions, and correlation data.
3. **Review**: route one representative repository to a private review destination; verify that no target mutation occurs and the proposal is actionable.
4. **Limited live**: manually target one low-risk repository; verify the resulting safe output and downstream CI.
5. **Scheduled live**: enable scheduled operation with `max_repos` kept small, then increase limits only from observed evidence.

Promotion evidence should cover successful authentication, correct target selection, output routing, no unexpected writes, worker completion, useful output quality, and acceptable AI credit consumption.

## Rollback

The first rollback action is to move the affected bundle to `preview`. For a narrower incident, disable the affected worker workflow so precomputation marks it ineligible. Then:

1. stop new dispatches;
2. inspect the orchestrator run and correlated worker runs;
3. close, revert, or supersede unintended safe outputs using normal repository procedures;
4. correct policy or worker behavior;
5. restart at preview and repeat promotion gates.

Do not reduce another bundle's mode unless the incident involves shared authentication or shared control behavior.
