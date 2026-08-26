---
title: Configuration Reference
description: Repository variables, secrets, and manual inputs for Central Agentic Ops.
---

Control-plane configuration is stored as GitHub repository variables and secrets in the private central control repository. Scheduled runs use that configuration. Manual workflow inputs define a separate run without changing scheduled configuration. Values computed inside a workflow are runtime state and must not be configured directly.

For a first installation, follow [Install and run safely](getting-started.md) and return here only for exact setting names and defaults. Keep every operation in `staged` and `max_repos` at `1` until its promotion checks pass.

## Required Baseline

For private or internal targets, alternate review repositories, or live target writes, configure at least one authentication method before operational runs:

1. A GitHub App using `GH_AW_GITHUB_APP_ID` and `GH_AW_GITHUB_APP_PRIVATE_KEY` is preferred.
2. A fine-grained PAT can be supplied through `GH_AW_GITHUB_TOKEN` as a fallback or as the only authentication method.

For public targets only, bounded staged scans can instead use the automatically provided `GITHUB_TOKEN`; no App or PAT secret is required. Review is supported without an App or PAT only when outputs stay in the current control repository and its workflow-token permissions authorize them. See [Public Read-Only Profile](authentication.md#public-read-only-profile).

Every installed operation has an independent mode. Installation defaults each mode to `staged`.

:::tip[Variables describe policy; secrets prove identity]
Put modes, limits, and owner names in repository variables. Put private keys and tokens in repository secrets. Never pass credentials through `workflow_dispatch` inputs.
:::

For a one-repository staged Dependabot rollout, set this baseline:

```bash
CONTROL_REPO="acme/central-agentic-ops"

gh variable set CENTRAL_AGENTIC_OPS_ALLOWED_OWNERS \
	--repo "$CONTROL_REPO" --body "acme"
gh variable set CENTRAL_AGENTIC_OPS_DEPENDABOT_MODE \
	--repo "$CONTROL_REPO" --body "staged"
gh variable set CENTRAL_AGENTIC_OPS_DEPENDABOT_MAX_REPOS \
	--repo "$CONTROL_REPO" --body "1"
```

Add an App or PAT when the target is private or internal. Keep the mode at `staged` until the promotion checks pass.

## Repository Variables

| Name | Scope | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `GH_AW_GITHUB_APP_ID` | Shared | With App authentication | None | GitHub App client ID used to mint short-lived installation tokens. |
| `CENTRAL_AGENTIC_OPS_ALLOWED_OWNERS` | Shared | No | Control repository owner | Comma-separated owners permitted for manual targets and review destinations. Wildcards are not supported. |
| `CENTRAL_AGENTIC_OPS_MAX_SCAN_REPOS` | Shared | No | `1000` | Maximum repositories examined by bounded automatic discovery. Accepts `1` through `100000`. |
| `CENTRAL_AGENTIC_OPS_CELL_COUNT` | Shared | No | `1` | Number of deterministic inventory cells. Accepts `1` through `1000`. |
| `CENTRAL_AGENTIC_OPS_CELL_INDEX` | Shared | No | `0` | Zero-based cell selected for a scheduled run. Must be smaller than `CENTRAL_AGENTIC_OPS_CELL_COUNT`. |
| `CENTRAL_AGENTIC_OPS_BATCH_SIZE` | Shared | No | `100000` | Maximum repositories exposed to an orchestrator from its selected cell. Accepts `1` through `100000`. |
| `CENTRAL_AGENTIC_OPS_BATCH_INDEX` | Shared | No | `0` | Zero-based batch selected for a scheduled run. |
| `CENTRAL_AGENTIC_OPS_MAX_AI_CREDITS_PER_RUN` | Shared | No | `1100` | Maximum declared orchestrator-plus-worker AI Credits admitted for one orchestration. |
| `CENTRAL_AGENTIC_OPS_AW_FAILURES_MODE` | AW Failures | Yes when installed | `staged` | Sets the operation mode to `staged`, `review`, or `live`. |
| `CENTRAL_AGENTIC_OPS_AW_FAILURES_MAX_REPOS` | AW Failures | No | `1` | Scheduled repository-selection cap. Accepts `1` through `1000`; dispatch limits may reduce it further. |
| `CENTRAL_AGENTIC_OPS_AW_FAILURES_ROLLOUT_PERCENT` | AW Failures | No | `100` | Limits selection to this percentage of discovered repositories. Accepts integers from `1` through `100`. |
| `CENTRAL_AGENTIC_OPS_AW_FAILURES_INVESTIGATOR_ENABLED` | AW Failures worker | No | `true` | Worker kill switch for the investigator. |
| `CENTRAL_AGENTIC_OPS_AW_FAILURES_INVESTIGATOR_MAX_MODE` | AW Failures worker | No | `staged` | Maximum investigator mode: `staged`, `review`, or `live`. |
| `CENTRAL_AGENTIC_OPS_DEPENDABOT_MODE` | Dependabot | Yes when installed | `staged` | Sets the operation mode to `staged`, `review`, or `live`. |
| `CENTRAL_AGENTIC_OPS_DEPENDABOT_MAX_REPOS` | Dependabot | No | `1` | Scheduled repository-selection cap. Accepts `1` through `1000`; dispatch limits may reduce it further. |
| `CENTRAL_AGENTIC_OPS_DEPENDABOT_ROLLOUT_PERCENT` | Dependabot | No | `100` | Limits selection to this percentage of discovered repositories. Accepts integers from `1` through `100`. |
| `CENTRAL_AGENTIC_OPS_DEPENDABOT_UPDATER_ENABLED` | Dependabot worker | No | `true` | Worker kill switch. Set to `false` to reject updater runs. |
| `CENTRAL_AGENTIC_OPS_DEPENDABOT_UPDATER_MAX_MODE` | Dependabot worker | No | `staged` | Maximum updater mode: `staged`, `review`, or `live`. |
| `CENTRAL_AGENTIC_OPS_OPTIMIZATION_MODE` | Optimization | Yes when installed | `staged` | Sets the operation mode to `staged`, `review`, or `live`. |
| `CENTRAL_AGENTIC_OPS_OPTIMIZATION_MAX_REPOS` | Optimization | No | `1` | Scheduled repository-selection cap. Accepts `1` through `1000`; dispatch limits may reduce it further. |
| `CENTRAL_AGENTIC_OPS_OPTIMIZATION_ROLLOUT_PERCENT` | Optimization | No | `100` | Limits selection to this percentage of discovered repositories. Accepts integers from `1` through `100`. |
| `CENTRAL_AGENTIC_OPS_OPTIMIZATION_AUDITOR_ENABLED` | Optimization worker | No | `true` | Worker kill switch for the auditor. |
| `CENTRAL_AGENTIC_OPS_OPTIMIZATION_AUDITOR_MAX_MODE` | Optimization worker | No | `staged` | Maximum auditor mode. |
| `CENTRAL_AGENTIC_OPS_OPTIMIZATION_OPTIMIZER_ENABLED` | Optimization worker | No | `true` | Worker kill switch for the optimizer. |
| `CENTRAL_AGENTIC_OPS_OPTIMIZATION_OPTIMIZER_MAX_MODE` | Optimization worker | No | `staged` | Maximum optimizer mode. |

An empty or unrecognized operation mode disables scheduled selection and worker workflow dispatch. It does not block a `workflow_dispatch` run. Scheduled review mode routes safe outputs to the current control-plane repository. For an all-stop procedure, see [Emergency Stop](operations.md#emergency-stop).

### Pages Report Destinations

When a workflow produces a Pages report, its existing review repository is also the review Pages destination. The repository must be private, Pages-enabled, and configured so the site is accessible only to the intended reviewers. Review publication fails closed when those conditions are not met. `safe_output_repo` keeps its standard control-plane meaning; no additional report-repository input or variable is required for review.

Production Pages configuration is fixed in the conventional publishing workflow and its protected environment. Agents and manual agentic-workflow inputs must not select the production repository, deployment environment, build command, or source paths. Review and production publishers use distinct repositories or environments, URLs, and concurrency groups.

## Repository Secrets

| Name | Scope | Required | Purpose |
| --- | --- | --- | --- |
| `GH_AW_GITHUB_APP_PRIVATE_KEY` | Shared | With App authentication | Private key paired with `GH_AW_GITHUB_APP_ID`. |
| `GH_AW_GITHUB_TOKEN` | Shared | For cross-repository access without a complete App configuration | Fine-grained PAT fallback for control-plane GitHub access. Not required for the public read-only profile. |
| `GH_AW_CI_TOKEN` | Dependabot | Optional | Token used by the Dependabot safe output path when an additional empty commit is required. |

Keep secrets in the control repository. Do not place credentials in variables, workflow inputs, dispatch envelopes, or target repositories. See [Authentication](authentication.md) for permissions, precedence, rotation, and revocation.

## workflow_dispatch Inputs

Both operation orchestrators expose the same inputs under **Run workflow**:

| Input | Type | Default | Effect |
| --- | --- | --- | --- |
| `target_repo` | String | Automatic discovery | Restricts the run to one fully qualified `owner/repository` target whose owner is allowlisted. |
| `safe_output_repo` | String | Current control-plane repository | Overrides the review safe output destination with an allowlisted repository for this manual run. |
| `max_repos` | Number | `1` | Caps repositories selected by this run. It cannot exceed the orchestrator workflow's declared dispatch limit. |
| `rollout_percent` | Number | `100` | Overrides the operation rollout percentage for this run. Accepts integers from `1` through `100`. |
| `cell_count` | Number | `1` | Partitions automatic discovery by immutable GitHub repository ID. |
| `cell_index` | Number | `0` | Selects one zero-based inventory cell. |
| `batch_size` | Number | `100000` | Bounds the repositories supplied to the orchestrator from that cell. |
| `batch_index` | Number | `0` | Selects one zero-based batch from that cell. |
| `safe_output_mode` | Choice | `staged` | Selects staged mode, review routing, or live safe output processing for this `workflow_dispatch` run. |

`workflow_dispatch` inputs affect only the dispatched run. They do not update repository variables or another operation's policy. Precompute emits a content-addressed `inventory_version` and deterministic `batch_id`; the same inventory and scheduling inputs produce the same batch. These controls do not auto-advance batches, retry work, or provide durable completion tracking. The percentage cap is rounded up so a non-empty candidate set can select at least one repository. `max_repos`, the percentage cap, and the target count permitted by the orchestrator workflow's remaining dispatch budget are cumulative; the smallest cap wins. Invalid or out-of-range caps fail precomputation. During validation, specify one `target_repo`, keep `max_repos` at `1`, and begin in staged mode.

Example cap calculation:

```text
25 discovered repositories x 10% rollout = 3 after rounding up
max_repos                                  = 5
dispatch budget                            = 4
---------------------------------------------------------------
selected repositories                      = min(3, 5, 4) = 3
```

:::note[Manual runs do not reconfigure schedules]
A manual `live` request affects only that run. It does not promote the scheduled operation, but it must still satisfy worker ceilings, owner allowlists, credential scope, and target authority.
:::

## Optional Observability Secrets

Observability is disabled when the corresponding settings are absent. These values are consumed as repository secrets.

| Name | Provider | Default or relationship |
| --- | --- | --- |
| `GH_AW_OTEL_SENTRY_ENDPOINT` | Sentry | No default; pair with the authorization secret. |
| `GH_AW_OTEL_SENTRY_AUTHORIZATION` | Sentry | Authorization header for the configured endpoint. |
| `GH_AW_OTEL_GRAFANA_ENDPOINT` | Grafana | No default; pair with the authorization secret. |
| `GH_AW_OTEL_GRAFANA_AUTHORIZATION` | Grafana | Authorization header for the configured endpoint. |
| `GH_AW_OTEL_DATADOG_ENDPOINT` | Datadog | Defaults to `https://otlp-intake.${DD_SITE}/v1/traces`. |
| `GH_AW_OTEL_DATADOG_API_KEY` | Datadog | Preferred API key; falls back to `DD_API_KEY`. |
| `DD_API_KEY` | Datadog | Fallback when `GH_AW_OTEL_DATADOG_API_KEY` is absent. |
| `DD_SITE` | Datadog | Defaults to `datadoghq.com`. |

## Runtime Resolution

Control values resolve in this order:

| Decision | Resolution |
| --- | --- |
| Authentication | GitHub App, then `GH_AW_GITHUB_TOKEN`, then the run's `GITHUB_TOKEN` where that token can authorize the operation. |
| Mode | Schedule-triggered runs use the operation mode variable. `workflow_dispatch` runs use the `safe_output_mode` workflow input and do not change or depend on the scheduled mode. Missing values default to `staged`; legacy `preview` values normalize to `staged`. |
| Review destination | `safe_output_repo` workflow input for a manual run, otherwise `github.repository`. |
| Allowed repository owners | `CENTRAL_AGENTIC_OPS_ALLOWED_OWNERS`, otherwise `github.repository_owner`. Applies to orchestrated and directly dispatched workers. |
| Absolute repository cap | `max_repos` workflow input, then the operation max-repositories variable, then `1`. |
| Discovery scan cap | `CENTRAL_AGENTIC_OPS_MAX_SCAN_REPOS`, then `1000`; hard maximum `100000`. |
| Scheduled inventory slice | Cell count/index and batch size/index variables; defaults select the complete discovered inventory. Manual inputs override these values for one run. |
| Aggregate AI Credit cap | `CENTRAL_AGENTIC_OPS_MAX_AI_CREDITS_PER_RUN`, then `1100`; selection is reduced to fit the declared orchestrator and worker maxima. |
| Rollout percentage | `rollout_percent` workflow input, then the operation rollout-percentage variable, then `100`. |
| Target selection | `target_repo` workflow input, otherwise control-plane discovery. |

Outside the public read-only profile, the GitHub App installation or PAT must include every repository that an enabled operation may inspect or update. Credential reach and `CENTRAL_AGENTIC_OPS_ALLOWED_OWNERS` are cumulative boundaries: satisfying one never bypasses the other. A value having higher precedence does not grant broader repository access or safe-output permissions.

Neither boundary records target consent or resolves authority between enterprise and organization runtimes. For `live` operation, scope credentials to repositories in the approved enrollment inventory and assign each `(target repository, operation)` pair to one control repository in the target's `.github/central-agentic-ops.yml`. A live worker reads that file from the target default branch and fails before agent execution unless its `central_repo` matches the operation authority. The runtime does not reconcile this file with custom properties, external approval records, or credential scope.

```yaml
version: 1
bundles:
	dependabot:
		authority: acme/central-agentic-ops
```

## Internal Runtime Values

The following names appear in workflow execution but are derived by shared control. Operators must not create repository variables or secrets for them.

| Name | Derived from |
| --- | --- |
| `CENTRAL_AGENTIC_OPS_MODE` | The importing operation's mode variable. |
| `GH_AW_SAFE_OUTPUT_MODE` | The `safe_output_mode` workflow input for a `workflow_dispatch` run; the operation mode for a schedule-triggered run. |
| `TARGET_REPO` | The `target_repo` workflow input or the worker workflow dispatch envelope. |
| `REVIEW_OUTPUT_REPO` | The `safe_output_repo` workflow input or current `github.repository`. |
| `SAFE_OUTPUT_REPO` | The effective destination computed for the selected mode. |
| `preview_only` | Whether the effective mode requires staged mode for safe outputs. |
| `GH_TOKEN` | The credential selected for explicit GitHub CLI steps. |
| `GITHUB_TOKEN` | A token supplied by GitHub Actions for the current run. |

Other `GH_AW_*` values, including safe-output files and staging flags, are managed by the gh-aw runtime and are not control-plane configuration.

## Sources of Truth

- Installer-exposed variables and secrets: `aw.yml`, `aw-failures/aw.yml`, `dependabot/aw.yml`, and `optimization/aw.yml`
- Shared resolution and precedence: `.github/workflows/shared/control.md`
- Manual inputs: `.github/workflows/aw-failures.md`, `.github/workflows/dependabot.md`, and `.github/workflows/optimization.md`
- Optional observability: `.github/workflows/shared/sentry.md`, `.github/workflows/shared/grafana.md`, and `.github/workflows/shared/datadog.md`

When adding or renaming a setting, update the installer manifest, consuming workflow, and this reference in the same change.