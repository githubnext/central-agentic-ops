---
title: Configuration Reference
description: Repository variables, secrets, and manual inputs for Central Agentic Ops.
---

Control-plane configuration is stored as GitHub repository variables and secrets in the private central control repository. Scheduled runs use that configuration. Manual workflow inputs define a separate run without changing scheduled configuration. Values computed inside a workflow are runtime state and must not be configured directly.

For a first installation, follow [Install and run safely](getting-started.md) and return here only for exact setting names and defaults. Keep every operation in `review` and `max_repos` at `1` until its promotion checks pass.

## Required Baseline

For private or internal targets, alternate review repositories, or live target writes, configure at least one authentication method before operational runs:

1. A GitHub App using `GH_AW_GITHUB_APP_ID` and `GH_AW_GITHUB_APP_PRIVATE_KEY` is preferred.
2. A fine-grained PAT can be supplied through `GH_AW_GITHUB_TOKEN` as a fallback or as the only authentication method.

For public targets only, bounded review runs can instead use the automatically provided `GITHUB_TOKEN`; no App or PAT secret is required when outputs stay in the current control repository and its workflow-token permissions authorize them. See [Public Read-Only Profile](authentication.md#public-read-only-profile).

Every installed operation has an independent output mode and kill switch. Installation defaults each mode to `review` and each kill switch to `true`, so packages are immediately runnable without target writes.

:::tip[Variables describe policy; secrets prove identity]
Put modes, limits, and owner names in repository variables. Put private keys and tokens in repository secrets. Never pass credentials through `workflow_dispatch` inputs.
:::

For a one-repository Dependabot review, set this baseline:

```bash
CONTROL_REPO="acme/central-agentic-ops"

gh variable set CENTRAL_AGENTIC_OPS_ALLOWED_OWNERS \
	--repo "$CONTROL_REPO" --body "acme"
gh variable set CENTRAL_AGENTIC_OPS_DEPENDABOT_MODE \
	--repo "$CONTROL_REPO" --body "review"
gh variable set CENTRAL_AGENTIC_OPS_DEPENDABOT_MAX_REPOS \
	--repo "$CONTROL_REPO" --body "1"
```

Add an App or PAT when the target is private or internal. Keep the mode at `review` until the promotion checks pass.

## Markdown Steering

Each workflow in an operation can load repository-specific instructions from `.github/cao/<operation>.md` in the control repository. For example, `.github/cao/dependabot.md` can describe organization-specific dependency priorities, repositories to prefer or avoid, or additional evidence to consider. The same file steers both orchestrator selection and worker execution.

The supported operation names are `advisory`, `ambient-context`, `aw-maintenance`, `dependabot`, `eu-cra-compliance`, and `optimization`. These files are optional runtime imports: operation jobs continue with their packaged instructions when the steering file does not exist. Because steering files are separate from package-owned workflow sources, `gh aw update` does not overwrite them.

Keep steering instructions within the operation's existing permissions, safety policy, and dispatch limits. Steering can refine selection and prioritization, but it cannot grant tools, credentials, permissions, or safe-output capabilities.

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
| `CENTRAL_AGENTIC_OPS_ADVISORY_ENABLED` | Advisory | No | `true` | Package kill switch. Set to `false` to stop orchestrator and worker dispatches. |
| `CENTRAL_AGENTIC_OPS_ADVISORY_MODE` | Advisory | No | `review` | Sets the output mode to `review` or `live`. |
| `CENTRAL_AGENTIC_OPS_ADVISORY_MAX_REPOS` | Advisory | No | `1` | Scheduled repository-selection cap. Accepts `1` through `1000`; dispatch and credit limits may reduce it further. |
| `CENTRAL_AGENTIC_OPS_ADVISORY_ROLLOUT_PERCENT` | Advisory | No | `100` | Limits selection to this percentage of discovered repositories. Accepts integers from `1` through `100`. |
| `CENTRAL_AGENTIC_OPS_ADVISORY_MONTHLY_AI_CREDIT_BUDGET` | Advisory | No | `0` | Monthly package budget in AI Credits. `0` disables monthly budget tuning. |
| `CENTRAL_AGENTIC_OPS_ADVISORY_UK_AI_OPERATIONAL_RESILIENCE_ENABLED` | Advisory worker | No | `true` | UK AI operational resilience worker kill switch. |
| `CENTRAL_AGENTIC_OPS_ADVISORY_UK_AI_OPERATIONAL_RESILIENCE_MAX_MODE` | Advisory worker | No | `review` | UK AI operational resilience worker mode ceiling. |
| `CENTRAL_AGENTIC_OPS_AMBIENT_CONTEXT_ENABLED` | Ambient Context | No | `true` | Package kill switch. Set to `false` to stop orchestrator and worker dispatches. |
| `CENTRAL_AGENTIC_OPS_AMBIENT_CONTEXT_MODE` | Ambient Context | No | `review` | Sets the output mode to `review` or `live`. |
| `CENTRAL_AGENTIC_OPS_AMBIENT_CONTEXT_MAX_REPOS` | Ambient Context | No | `1` | Scheduled repository-selection cap. Accepts `1` through `1000`; dispatch limits may reduce it further. |
| `CENTRAL_AGENTIC_OPS_AMBIENT_CONTEXT_ROLLOUT_PERCENT` | Ambient Context | No | `100` | Limits selection to this percentage of discovered repositories. Accepts integers from `1` through `100`. |
| `CENTRAL_AGENTIC_OPS_AMBIENT_CONTEXT_MONTHLY_AI_CREDIT_BUDGET` | Ambient Context | No | `0` | Monthly package budget in AI Credits. `0` disables monthly budget tuning. |
| `CENTRAL_AGENTIC_OPS_AMBIENT_CONTEXT_AGENTS_MD_ENABLED` | Ambient Context worker | No | `true` | Worker kill switch for the `AGENTS.md` curator. |
| `CENTRAL_AGENTIC_OPS_AMBIENT_CONTEXT_AGENTS_MD_MAX_MODE` | Ambient Context worker | No | `review` | Maximum `AGENTS.md` curator mode. |
| `CENTRAL_AGENTIC_OPS_AMBIENT_CONTEXT_SKILLS_ENABLED` | Ambient Context worker | No | `true` | Worker kill switch for the skills curator. |
| `CENTRAL_AGENTIC_OPS_AMBIENT_CONTEXT_SKILLS_MAX_MODE` | Ambient Context worker | No | `review` | Maximum skills curator mode. |
| `CENTRAL_AGENTIC_OPS_AW_MAINTENANCE_FAILURES_ENABLED` | AW Maintenance failure worker | No | `true` | Worker kill switch for the investigator. |
| `CENTRAL_AGENTIC_OPS_AW_MAINTENANCE_FAILURES_MAX_MODE` | AW Maintenance failure worker | No | `review` | Maximum investigator mode: `review` or `live`. |
| `CENTRAL_AGENTIC_OPS_AW_MAINTENANCE_ENABLED` | AW Maintenance | No | `true` | Package kill switch. Set to `false` to stop orchestrator and worker dispatches. |
| `CENTRAL_AGENTIC_OPS_AW_MAINTENANCE_MODE` | AW Maintenance | No | `review` | Sets the output mode to `review` or `live`. |
| `CENTRAL_AGENTIC_OPS_AW_MAINTENANCE_MAX_REPOS` | AW Maintenance | No | `1` | Scheduled repository-selection cap. Accepts `1` through `1000`; dispatch limits may reduce it further. |
| `CENTRAL_AGENTIC_OPS_AW_MAINTENANCE_ROLLOUT_PERCENT` | AW Maintenance | No | `100` | Limits selection to this percentage of discovered repositories. Accepts integers from `1` through `100`. |
| `CENTRAL_AGENTIC_OPS_AW_MAINTENANCE_MONTHLY_AI_CREDIT_BUDGET` | AW Maintenance | No | `0` | Monthly package budget in AI Credits. `0` disables monthly budget tuning. |
| `CENTRAL_AGENTIC_OPS_AW_MAINTENANCE_UPGRADE_ENABLED` | AW Maintenance worker | No | `true` | Worker kill switch for the upgrade worker. |
| `CENTRAL_AGENTIC_OPS_AW_MAINTENANCE_UPGRADE_MAX_MODE` | AW Maintenance worker | No | `review` | Maximum upgrade worker mode: `review` or `live`. |
| `CENTRAL_AGENTIC_OPS_DEPENDABOT_ENABLED` | Dependabot | No | `true` | Package kill switch. Set to `false` to stop orchestrator and worker dispatches. |
| `CENTRAL_AGENTIC_OPS_DEPENDABOT_MODE` | Dependabot | No | `review` | Sets the output mode to `review` or `live`. |
| `CENTRAL_AGENTIC_OPS_DEPENDABOT_MAX_REPOS` | Dependabot | No | `1` | Scheduled repository-selection cap. Accepts `1` through `1000`; dispatch limits may reduce it further. |
| `CENTRAL_AGENTIC_OPS_DEPENDABOT_ROLLOUT_PERCENT` | Dependabot | No | `100` | Limits selection to this percentage of discovered repositories. Accepts integers from `1` through `100`. |
| `CENTRAL_AGENTIC_OPS_DEPENDABOT_MONTHLY_AI_CREDIT_BUDGET` | Dependabot | No | `0` | Monthly package budget in AI Credits. `0` disables monthly budget tuning. |
| `CENTRAL_AGENTIC_OPS_DEPENDABOT_UPDATER_ENABLED` | Dependabot worker | No | `true` | Worker kill switch. Set to `false` to reject updater runs. |
| `CENTRAL_AGENTIC_OPS_DEPENDABOT_UPDATER_MAX_MODE` | Dependabot worker | No | `review` | Maximum updater mode: `review` or `live`. |
| `CENTRAL_AGENTIC_OPS_EU_CRA_COMPLIANCE_ENABLED` | EU CRA Advisor | No | `true` | Package kill switch. Set to `false` to stop orchestrator and worker dispatches. |
| `CENTRAL_AGENTIC_OPS_EU_CRA_COMPLIANCE_MODE` | EU CRA Advisor | No | `review` | Sets the output mode to `review` or `live`. |
| `CENTRAL_AGENTIC_OPS_EU_CRA_COMPLIANCE_MAX_REPOS` | EU CRA Advisor | No | `1` | Scheduled repository-selection cap. Accepts `1` through `1000`; dispatch and credit limits may reduce it further. |
| `CENTRAL_AGENTIC_OPS_EU_CRA_COMPLIANCE_ROLLOUT_PERCENT` | EU CRA Advisor | No | `100` | Limits selection to this percentage of discovered repositories. Accepts integers from `1` through `100`. |
| `CENTRAL_AGENTIC_OPS_EU_CRA_COMPLIANCE_MONTHLY_AI_CREDIT_BUDGET` | EU CRA Advisor | No | `0` | Monthly package budget in AI Credits. `0` disables monthly budget tuning. |
| `CENTRAL_AGENTIC_OPS_EU_CRA_COMPLIANCE_SCOPE_CLASSIFIER_ENABLED` | EU CRA Advisor worker | No | `true` | Scope classifier kill switch. |
| `CENTRAL_AGENTIC_OPS_EU_CRA_COMPLIANCE_SCOPE_CLASSIFIER_MAX_MODE` | EU CRA Advisor worker | No | `review` | Scope classifier mode ceiling. |
| `CENTRAL_AGENTIC_OPS_EU_CRA_COMPLIANCE_SECURITY_REQUIREMENTS_AUDITOR_ENABLED` | EU CRA Advisor worker | No | `true` | Security requirements auditor kill switch. |
| `CENTRAL_AGENTIC_OPS_EU_CRA_COMPLIANCE_SECURITY_REQUIREMENTS_AUDITOR_MAX_MODE` | EU CRA Advisor worker | No | `review` | Security requirements auditor mode ceiling. |
| `CENTRAL_AGENTIC_OPS_EU_CRA_COMPLIANCE_SUPPLY_CHAIN_SBOM_AUDITOR_ENABLED` | EU CRA Advisor worker | No | `true` | Supply-chain/SBOM auditor kill switch. |
| `CENTRAL_AGENTIC_OPS_EU_CRA_COMPLIANCE_SUPPLY_CHAIN_SBOM_AUDITOR_MAX_MODE` | EU CRA Advisor worker | No | `review` | Supply-chain/SBOM auditor mode ceiling. |
| `CENTRAL_AGENTIC_OPS_EU_CRA_COMPLIANCE_VULNERABILITY_HANDLING_AUDITOR_ENABLED` | EU CRA Advisor worker | No | `true` | Vulnerability-handling auditor kill switch. |
| `CENTRAL_AGENTIC_OPS_EU_CRA_COMPLIANCE_VULNERABILITY_HANDLING_AUDITOR_MAX_MODE` | EU CRA Advisor worker | No | `review` | Vulnerability-handling auditor mode ceiling. |
| `CENTRAL_AGENTIC_OPS_EU_CRA_COMPLIANCE_ARTICLE_14_REPORTING_READINESS_ENABLED` | EU CRA Advisor worker | No | `true` | Article 14 reporting-readiness kill switch. |
| `CENTRAL_AGENTIC_OPS_EU_CRA_COMPLIANCE_ARTICLE_14_REPORTING_READINESS_MAX_MODE` | EU CRA Advisor worker | No | `review` | Article 14 reporting-readiness mode ceiling. |
| `CENTRAL_AGENTIC_OPS_EU_CRA_COMPLIANCE_CONFORMITY_RELEASE_EVIDENCE_ENABLED` | EU CRA Advisor worker | No | `true` | Conformity/release-evidence kill switch. |
| `CENTRAL_AGENTIC_OPS_EU_CRA_COMPLIANCE_CONFORMITY_RELEASE_EVIDENCE_MAX_MODE` | EU CRA Advisor worker | No | `review` | Conformity/release-evidence mode ceiling. |
| `CENTRAL_AGENTIC_OPS_OPTIMIZATION_ENABLED` | Optimization | No | `true` | Package kill switch. Set to `false` to stop orchestrator and worker dispatches. |
| `CENTRAL_AGENTIC_OPS_OPTIMIZATION_MODE` | Optimization | No | `review` | Sets the output mode to `review` or `live`. |
| `CENTRAL_AGENTIC_OPS_OPTIMIZATION_MAX_REPOS` | Optimization | No | `1` | Scheduled repository-selection cap. Accepts `1` through `1000`; dispatch limits may reduce it further. |
| `CENTRAL_AGENTIC_OPS_OPTIMIZATION_ROLLOUT_PERCENT` | Optimization | No | `100` | Limits selection to this percentage of discovered repositories. Accepts integers from `1` through `100`. |
| `CENTRAL_AGENTIC_OPS_OPTIMIZATION_MONTHLY_AI_CREDIT_BUDGET` | Optimization | No | `0` | Monthly package budget in AI Credits. `0` disables monthly budget tuning. |
| `CENTRAL_AGENTIC_OPS_OPTIMIZATION_AUDITOR_ENABLED` | Optimization worker | No | `true` | Worker kill switch for the auditor. |
| `CENTRAL_AGENTIC_OPS_OPTIMIZATION_AUDITOR_MAX_MODE` | Optimization worker | No | `review` | Maximum auditor mode. |
| `CENTRAL_AGENTIC_OPS_OPTIMIZATION_OPTIMIZER_ENABLED` | Optimization worker | No | `true` | Worker kill switch for the optimizer. |
| `CENTRAL_AGENTIC_OPS_OPTIMIZATION_OPTIMIZER_MAX_MODE` | Optimization worker | No | `review` | Maximum optimizer mode. |

Only `review` and `live` are valid output modes. Set the package's `CENTRAL_AGENTIC_OPS_<PACKAGE>_ENABLED` variable to `false` to disable both scheduled and manual dispatches. Scheduled review mode routes safe outputs to the current control-plane repository. For an all-stop procedure, see [Emergency Stop](operations.md#emergency-stop).

### Monthly Package Budgets

Set `CENTRAL_AGENTIC_OPS_<PACKAGE>_MONTHLY_AI_CREDIT_BUDGET` to a positive integer to enable monthly budget tuning for that package. AI Credits are the native billing unit; 1 AIC is $0.01 USD. For example, this gives Dependabot a 10,000 AIC ($100) monthly budget:

```bash
gh variable set CENTRAL_AGENTIC_OPS_DEPENDABOT_MONTHLY_AI_CREDIT_BUDGET \
	--repo "acme/central-agentic-ops" --body "10000"
```

Before each scheduled or manual orchestration, shared control totals actual AIC for the package orchestrator and its workers since the first day of the current UTC month. It reserves the orchestrator's declared maximum and admits the largest whole number of target worker sets that fits the remaining budget. Existing `max_repos`, rollout, dispatch, and per-run AI Credit caps remain cumulative, so the smallest cap wins. This feedback loop drives admitted workload toward the budget without admitting a worker set whose declared maximum exceeds the remaining capacity after the orchestration reserve. Exact utilization can remain below 100 percent when less than one complete target set fits or a run consumes less than its declared maximum. Because the orchestrator has already started when this check runs, this is a worker-admission budget rather than an account-level billing hard stop.

Budget usage must be readable. If any package workflow's month-to-date logs are unavailable or invalid, the orchestration fails closed with zero dispatch capacity instead of running without the configured budget. Set the variable to `0` or delete it to disable monthly budget tuning.

### Pages Report Destinations

When a workflow produces a Pages report, its existing review repository is also the review Pages destination. The repository must be private, Pages-enabled, and configured so the site is accessible only to the intended reviewers. Review publication fails closed when those conditions are not met. `safe_output_repo` keeps its standard control-plane meaning; no additional report-repository input or variable is required for review.

Production Pages configuration is fixed in the conventional publishing workflow and its protected environment. Agents and manual agentic-workflow inputs must not select the production repository, deployment environment, build command, or source paths. Review and production publishers use distinct repositories or environments, URLs, and concurrency groups.

### Ops Publish Add-on

The optional conventional Ops Publish add-on uses `CENTRAL_AGENTIC_OPS_PUBLISH_REVIEWERS` as a required comma-separated allowlist of GitHub user logins permitted to apply publication approval. `CENTRAL_AGENTIC_OPS_PUBLISH_CONTROL_REPOS` lists the exact control repositories whose generated review issues may be published and defaults to the repository containing the add-on. The target owner and repository must also satisfy `CENTRAL_AGENTIC_OPS_ALLOWED_OWNERS` and `CENTRAL_AGENTIC_OPS_ALLOWED_REPOS`.

Ops Publish prefers the existing GitHub App configuration. PAT fallback uses separate fine-grained `CENTRAL_AGENTIC_OPS_PUBLISH_CONTROL_TOKEN` and `CENTRAL_AGENTIC_OPS_PUBLISH_TARGET_TOKEN` secrets so control-run reads and target writes do not share a broad credential. The control token requires Actions read access only to listed control repositories; the target token requires Contents read plus Issues write access only to allowed targets. See [Ops Publish](operations.md#publishing-reviewed-operation-issues).

## Repository Secrets

| Name | Scope | Required | Purpose |
| --- | --- | --- | --- |
| `GH_AW_GITHUB_APP_PRIVATE_KEY` | Shared | With App authentication | Private key paired with `GH_AW_GITHUB_APP_ID`. |
| `GH_AW_GITHUB_TOKEN` | Shared | For cross-repository access without a complete App configuration | Fine-grained PAT fallback for control-plane GitHub access. Not required for public targets reviewed in the control repository. |
| `GH_AW_CI_TOKEN` | Dependabot | Optional | Token used by the Dependabot safe output path when an additional empty commit is required. |

Keep secrets in the control repository. Do not place credentials in variables, workflow inputs, dispatch envelopes, or target repositories. See [Authentication](authentication.md) for permissions, precedence, rotation, and revocation.

## workflow_dispatch Inputs

Both operation orchestrators expose the same inputs under **Run workflow**:

| Input | Type | Default | Effect |
| --- | --- | --- | --- |
| `target_repo` | String | Control repository in `review`; automatic discovery in `live` | Restricts the run to one fully qualified `owner/repository` target whose owner is allowlisted. |
| `safe_output_repo` | String | Current control-plane repository | Overrides the review safe output destination with an allowlisted repository for this manual run. |
| `max_repos` | Number | `1` | Caps repositories selected by this run. It cannot exceed the orchestrator workflow's declared dispatch limit. |
| `rollout_percent` | Number | `100` | Overrides the operation rollout percentage for this run. Accepts integers from `1` through `100`. |
| `cell_count` | Number | `1` | Partitions automatic discovery by immutable GitHub repository ID. |
| `cell_index` | Number | `0` | Selects one zero-based inventory cell. |
| `batch_size` | Number | `100000` | Bounds the repositories supplied to the orchestrator from that cell. |
| `batch_index` | Number | `0` | Selects one zero-based batch from that cell. |
| `safe_output_mode` | Choice | `review` | Selects review routing or live safe output processing for this `workflow_dispatch` run. |

`workflow_dispatch` inputs affect only the dispatched run. They do not update repository variables or another operation's policy. Precompute emits a content-addressed `inventory_version` and deterministic `batch_id`; the same inventory and scheduling inputs produce the same batch. These controls do not auto-advance batches, retry work, or provide durable completion tracking. The percentage cap is rounded up so a non-empty candidate set can select at least one repository. `max_repos`, the percentage cap, and the target count permitted by the orchestrator workflow's remaining dispatch budget are cumulative; the smallest cap wins. Invalid or out-of-range caps fail precomputation. During validation, leave `target_repo` blank to review the control repository itself or specify one explicit target, keep `max_repos` at `1`, and begin in review mode.

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

## Optional Observability Configuration

The dispatcher span is built into `shared/control.md`; exporter configuration determines where gh-aw sends it. For centralized configuration, set the `GH_AW_DEFAULT_OTLP_ENDPOINT` Actions variable and the `GH_AW_DEFAULT_OTLP_HEADERS` Actions secret at repository, organization, or enterprise scope. Every compiled workflow uses those defaults when it has no explicit `observability.otlp` configuration. Export is disabled when the endpoint or its matching headers are absent.

| Name | Kind | Purpose |
| --- | --- | --- |
| `GH_AW_DEFAULT_OTLP_ENDPOINT` | Variable | Default OTLP endpoint for every workflow without an explicit exporter import. |
| `GH_AW_DEFAULT_OTLP_HEADERS` | Secret | Comma-separated `key=value` headers paired with the default endpoint. |

Configure one default OTLP/HTTP traces endpoint for a control repository with:

```bash
CONTROL_REPO="acme/central-agentic-ops"
gh variable set GH_AW_DEFAULT_OTLP_ENDPOINT \
	--repo "$CONTROL_REPO" \
	--body "https://collector.example.com/v1/traces"
gh secret set GH_AW_DEFAULT_OTLP_HEADERS --repo "$CONTROL_REPO"
```

At the secret prompt, enter the complete comma-separated exporter header string, such as `Authorization=Bearer <token>` or `Authorization=Basic <credentials>,X-Scope-OrgID=<tenant>`. Use the exact OTLP/HTTP traces URL and headers issued by the backend. Run the same commands with `--org <organization>` instead of `--repo` to configure organization defaults. Enterprise administrators can define the same Actions variable and secret through enterprise policy.

The source repository also contains optional `shared/sentry.md`, `shared/grafana.md`, and `shared/datadog.md` imports for explicit provider routing and fan-out. They configure exporters only; they do not create the dispatcher span, are not imported by packages by default, and override the organization defaults when used.

| Provider | Endpoint | Header emitted by the shared import |
| --- | --- | --- |
| Sentry | `GH_AW_OTEL_SENTRY_ENDPOINT`: complete OTLP/HTTP traces endpoint issued by Sentry; no default. | `Authorization: <GH_AW_OTEL_SENTRY_AUTHORIZATION>` |
| Grafana Cloud | `GH_AW_OTEL_GRAFANA_ENDPOINT`: complete OTLP/HTTP traces endpoint from the Grafana Cloud OpenTelemetry configuration; no default. | `Authorization: <GH_AW_OTEL_GRAFANA_AUTHORIZATION>` |
| Datadog | `GH_AW_OTEL_DATADOG_ENDPOINT`, or `https://otlp-intake.<DD_SITE>/v1/traces` when omitted. | `DD-API-KEY: <GH_AW_OTEL_DATADOG_API_KEY or DD_API_KEY>` |

Set only the secrets for the selected providers. `gh secret set` prompts for each value so credentials do not need to appear in shell history:

```bash
CONTROL_REPO="acme/central-agentic-ops"

# Sentry
gh secret set GH_AW_OTEL_SENTRY_ENDPOINT --repo "$CONTROL_REPO"
gh secret set GH_AW_OTEL_SENTRY_AUTHORIZATION --repo "$CONTROL_REPO"

# Grafana Cloud
gh secret set GH_AW_OTEL_GRAFANA_ENDPOINT --repo "$CONTROL_REPO"
gh secret set GH_AW_OTEL_GRAFANA_AUTHORIZATION --repo "$CONTROL_REPO"

# Datadog
gh secret set GH_AW_OTEL_DATADOG_API_KEY --repo "$CONTROL_REPO"
gh secret set DD_SITE --repo "$CONTROL_REPO"
# Optional endpoint override:
gh secret set GH_AW_OTEL_DATADOG_ENDPOINT --repo "$CONTROL_REPO"
```

In this source checkout, enable one or more explicit exporters by uncommenting their imports in `.github/workflows/shared/control.md`:

```yaml
imports:
	- uses: sentry.md
	- uses: grafana.md
	- uses: datadog.md
	- uses: control-precompute.md
		# Existing control-precompute inputs remain unchanged.
```

Keep only the providers being configured, then run `gh aw compile` and commit the changed workflow sources and any tracked generated files required by the consuming repository. Installed Central Agentic Ops packages do not include these optional provider files by default; use `GH_AW_DEFAULT_OTLP_ENDPOINT` and `GH_AW_DEFAULT_OTLP_HEADERS` unless the package is deliberately customized to carry the selected shared imports.

The complete provider-specific setting reference is:

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
| Package enablement | `CENTRAL_AGENTIC_OPS_<PACKAGE>_ENABLED`, then `true`. A false value stops scheduled and manual package dispatches before repository access. |
| Mode | Schedule-triggered runs use the operation mode variable. `workflow_dispatch` runs use the `safe_output_mode` workflow input and do not change the scheduled mode. Missing values default to `review`; only `review` and `live` are valid. |
| Review destination | `safe_output_repo` workflow input for a manual run, otherwise `github.repository`. |
| Allowed repository owners | `CENTRAL_AGENTIC_OPS_ALLOWED_OWNERS`, otherwise `github.repository_owner`. Applies to orchestrated and directly dispatched workers. |
| Absolute repository cap | `max_repos` workflow input, then the operation max-repositories variable, then `1`. |
| Discovery scan cap | `CENTRAL_AGENTIC_OPS_MAX_SCAN_REPOS`, then `1000`; hard maximum `100000`. |
| Scheduled inventory slice | Cell count/index and batch size/index variables; defaults select the complete discovered inventory. Manual inputs override these values for one run. |
| Aggregate AI Credit cap | `CENTRAL_AGENTIC_OPS_MAX_AI_CREDITS_PER_RUN`, then `1100`; selection is reduced to fit the declared orchestrator and worker maxima. |
| Monthly package AI Credit budget | `CENTRAL_AGENTIC_OPS_<PACKAGE>_MONTHLY_AI_CREDIT_BUDGET`, then `0` (disabled); when enabled, month-to-date actual AIC and declared run maxima reduce target selection to the remaining monthly capacity. |
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
| `GH_TOKEN` | The credential selected for explicit GitHub CLI steps. |
| `GITHUB_TOKEN` | A token supplied by GitHub Actions for the current run. |

Other `GH_AW_*` values, including safe-output files, are managed by the gh-aw runtime and are not control-plane configuration.

## Sources of Truth

- Package inventory and minimum gh-aw versions: `aw.yml`, `advisory/aw.yml`, `ambient-context/aw.yml`, `aw-maintenance/aw.yml`, `dependabot/aw.yml`, `eu-cra-compliance/aw.yml`, and `optimization/aw.yml`
- Shared resolution and precedence: `.github/workflows/shared/control.md`
- Manual inputs: `.github/workflows/advisory.md`, `.github/workflows/ambient-context.md`, `.github/workflows/aw-maintenance.md`, `.github/workflows/dependabot.md`, `.github/workflows/eu-cra-compliance.md`, and `.github/workflows/optimization.md`
- Optional observability: `.github/workflows/shared/sentry.md`, `.github/workflows/shared/grafana.md`, and `.github/workflows/shared/datadog.md`

When adding or renaming a setting, update the installer manifest, consuming workflow, and this reference in the same change.