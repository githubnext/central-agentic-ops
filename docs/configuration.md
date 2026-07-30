# Configuration Reference

Control-plane configuration is stored as GitHub repository variables and secrets in the private central control repository. Manual workflow inputs can override selected settings for one run. Values computed inside a workflow are runtime state and must not be configured directly.

## Required Baseline

Configure at least one authentication method before operational runs:

1. A GitHub App using `GH_AW_GITHUB_APP_ID` and `GH_AW_GITHUB_APP_PRIVATE_KEY` is preferred.
2. A fine-grained PAT can be supplied through `GH_AW_GITHUB_TOKEN` as a fallback or as the only authentication method.

Every installed bundle has an independent mode. Installation defaults each mode to `preview`.

## Repository Variables

| Name | Scope | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `GH_AW_GITHUB_APP_ID` | Shared | With App authentication | None | GitHub App client ID used to mint short-lived installation tokens. |
| `CENTRAL_AGENTIC_OPS_DEPENDABOT_MODE` | Dependabot | Yes when installed | `preview` | Sets the bundle mode to `preview`, `review`, or `live`. |
| `CENTRAL_AGENTIC_OPS_DEPENDABOT_REVIEW_REPO` | Dependabot | In `review` mode | None | Private review destination in `owner/repository` form. |
| `CENTRAL_AGENTIC_OPS_OPTIMIZATION_MODE` | Optimization | Yes when installed | `preview` | Sets the bundle mode to `preview`, `review`, or `live`. |
| `CENTRAL_AGENTIC_OPS_OPTIMIZATION_REVIEW_REPO` | Optimization | In `review` mode | None | Private review destination in `owner/repository` form. |

An empty or unrecognized bundle mode disables scheduled selection and dispatch. It does not block a manual workflow dispatch. Review mode without its review-repository variable also dispatches no workers. For an all-stop procedure, see [Emergency Stop](operations.md#emergency-stop).

## Repository Secrets

| Name | Scope | Required | Purpose |
| --- | --- | --- | --- |
| `GH_AW_GITHUB_APP_PRIVATE_KEY` | Shared | With App authentication | Private key paired with `GH_AW_GITHUB_APP_ID`. |
| `GH_AW_GITHUB_TOKEN` | Shared | Without a complete App configuration | Fine-grained PAT fallback for control-plane GitHub access. |
| `GH_AW_CI_TOKEN` | Dependabot | Optional | Token used by the Dependabot safe-output path when an additional empty commit is required. |

Keep secrets in the control repository. Do not place credentials in variables, workflow inputs, dispatch envelopes, or target repositories. See [Authentication](authentication.md) for permissions, precedence, rotation, and revocation.

## Manual Run Inputs

Both bundle orchestrators expose the same inputs under **Run workflow**:

| Input | Type | Default | Effect |
| --- | --- | --- | --- |
| `target_repo` | String | Automatic discovery | Restricts the run to one fully qualified `owner/repository` target. |
| `safe_output_repo` | String | Bundle review repository | Overrides the output destination for this run; required with `review` when no bundle review repository is configured. |
| `max_repos` | Number | `1` | Caps repositories selected by this run. It cannot exceed the orchestrator's declared dispatch limit. |
| `safe_output_mode` | Choice | `preview` | Sets this run to `preview`, `review`, or `live`. |

Manual inputs affect only the dispatched run. They do not update repository variables or another bundle's policy. During validation, specify one `target_repo`, keep `max_repos` at `1`, and begin in `preview`.

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

## Precedence

Control values resolve in this order:

| Decision | Precedence |
| --- | --- |
| Authentication | GitHub App, then `GH_AW_GITHUB_TOKEN`, then the run's `GITHUB_TOKEN` where that token can authorize the operation. |
| Mode | Manual `safe_output_mode`, then the bundle mode variable, then `preview`. |
| Review destination | Manual `safe_output_repo`, then the bundle review-repository variable. |
| Target selection | Manual `target_repo`, otherwise control-plane discovery. |

The GitHub App installation or PAT must include every repository that an enabled bundle may inspect or update. A value having higher precedence does not grant broader repository access or safe-output permissions.

## Internal Runtime Values

The following names appear in workflow execution but are derived by shared control. Operators must not create repository variables or secrets for them.

| Name | Derived from |
| --- | --- |
| `CENTRAL_AGENTIC_OPS_MODE` | The importing bundle's mode variable. |
| `GH_AW_SAFE_OUTPUT_MODE` | The manual mode input or bundle mode. |
| `TARGET_REPO` | The manual target input or the worker dispatch envelope. |
| `REVIEW_OUTPUT_REPO` | The manual output destination or bundle review repository. |
| `SAFE_OUTPUT_REPO` | The effective destination computed for the selected mode. |
| `preview_only` | Whether the effective mode requires staged output. |
| `GH_TOKEN` | The credential selected for explicit GitHub CLI steps. |
| `GITHUB_TOKEN` | A token supplied by GitHub Actions for the current run. |

Other `GH_AW_*` values, including safe-output files and staging flags, are managed by the gh-aw runtime and are not control-plane configuration.

## Sources of Truth

- Installer-exposed variables and secrets: `aw.yml`, `dependabot/aw.yml`, and `optimization/aw.yml`
- Shared resolution and precedence: `.github/workflows/shared/control.md`
- Manual inputs: `.github/workflows/dependabot.md` and `.github/workflows/optimization.md`
- Optional observability: `.github/workflows/shared/sentry.md`, `.github/workflows/shared/grafana.md`, and `.github/workflows/shared/datadog.md`

When adding or renaming a setting, update the installer manifest, consuming workflow, and this reference in the same change.