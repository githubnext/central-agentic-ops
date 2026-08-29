---
title: Configuration Reference
description: Checked-in policy, credential secrets, and manual inputs for Central Agentic Ops.
---

Persistent non-secret policy lives only in `.github/central-agentic-ops.json` in the private control repository. Workflows read that file at the exact `github.workflow_sha`, so workflow code and policy are one reviewed revision. Repository variables named `CENTRAL_AGENTIC_OPS_*` are not read as defaults, overrides, or compatibility fallbacks.

Keep credentials in Actions secrets. Manual inputs may select a target or narrow a checked-in limit for one run, but they never change policy or widen it.

## Control Policy

This minimal policy enables one Dependabot worker in `review` mode for repositories owned by `acme`:

```json
{
  "version": 1,
  "control-plane": {
    "scope": {
      "allowed-owners": ["acme"]
    },
    "packages": {
      "dependabot": {
        "workers": {
          "release-train-updater": {}
        }
      }
    }
  }
}
```

Commit the file before running an installed operation. A missing or invalid document fails closed. An undeclared package or worker produces a native no-op before repository discovery or agent execution.

The schema defaults are:

| JSON path | Default | Range or values |
| --- | --- | --- |
| `control-plane.scope.allowed-owners` | Control repository owner | Owner names |
| `control-plane.scope.allowed-repositories` | All repositories under an allowed owner | Exact `owner/repository` names |
| `control-plane.inventory.max-scan-repositories` | `1000` | `1` through `100000` |
| `control-plane.inventory.cell-count` | `1` | `1` through `1000` |
| `control-plane.inventory.cell-index` | `0` | Less than `cell-count` |
| `control-plane.inventory.batch-size` | `100000` | `1` through `100000` |
| `control-plane.inventory.batch-index` | `0` | Non-negative integer |
| `control-plane.defaults.mode` | `review` | `review` or `live` |
| `control-plane.defaults.max-repositories` | `1` | `1` through `1000` |
| `control-plane.defaults.rollout-percent` | `100` | `1` through `100` |
| `control-plane.defaults.monthly-ai-credit-budget` | `0` | Non-negative integer AIC; `0` disables tuning |

Each entry under `control-plane.packages` may override the defaults with `enabled`, `mode`, `max-repositories`, `rollout-percent`, and `monthly-ai-credit-budget`. Each declared worker may set `enabled` and `max-mode`. Package and worker names are closed to the catalog identifiers documented in the [Control Policy Specification](control-policy-specification.md).

For example, this policy enables bounded live Dependabot operation while retaining a review-only worker ceiling until that worker is promoted:

```json
{
  "version": 1,
  "control-plane": {
    "scope": {
      "allowed-owners": ["acme"],
      "allowed-repositories": ["acme/example-service"]
    },
    "packages": {
      "dependabot": {
        "mode": "live",
        "max-repositories": 1,
        "rollout-percent": 10,
        "monthly-ai-credit-budget": 10000,
        "workers": {
          "release-train-updater": {
            "max-mode": "review"
          }
        }
      }
    }
  }
}
```

Shared control applies schema defaults, then `control-plane.defaults`, then package values, then the worker ceiling. A dispatch request may narrow the result. Any attempt to widen mode, repository count, or rollout percentage fails closed.

### Monthly Package Budgets

Set `monthly-ai-credit-budget` on a package to a positive integer to enable monthly tuning. AI Credits are the native billing unit; 1 AIC is $0.01 USD. Before orchestration, shared control reads month-to-date usage, reserves the orchestrator's declared maximum, and admits only complete worker sets that fit the remaining budget. Existing repository, rollout, dispatch, and workflow credit limits remain cumulative.

If usage logs are unavailable or invalid, the orchestration admits no workers instead of ignoring the budget. Set the JSON value to `0` or remove it to disable monthly tuning.

## Target Authority

`live` workers also require `.github/central-agentic-ops.json` on the target's protected default branch. The target assigns each package to one control repository:

```json
{
  "version": 1,
  "target-authority": {
    "packages": {
      "dependabot": {
        "authority": "acme/central-agentic-ops"
      }
    }
  }
}
```

The worker resolves the target default branch to an exact SHA and validates this document before agent execution. Review runs do not require target authority because they cannot mutate the target.

## Credential Secrets

For private or internal targets, alternate review repositories, or live writes, configure a GitHub App or fine-grained PAT. For bounded review runs against public targets, no App or PAT secret is required when outputs stay in the current control repository.

| Name | Required | Purpose |
| --- | --- | --- |
| `GH_AW_GITHUB_APP_ID` | With App authentication | GitHub App client ID. |
| `GH_AW_GITHUB_APP_PRIVATE_KEY` | With App authentication | Private key paired with the App ID. |
| `GH_AW_GITHUB_TOKEN` | PAT fallback | Fine-grained token for cross-repository access. |
| `GH_AW_CI_TOKEN` | Optional Dependabot path | Additional token used only when an empty CI commit is required. |

Store all four as Actions secrets. The App ID is not policy, but keeping both App values secret avoids a second configuration channel. Shared control selects an App installation token first, then `GH_AW_GITHUB_TOKEN`, then the run-scoped `GITHUB_TOKEN` when its reach is sufficient.

## Manual Inputs

Operation orchestrators expose these `workflow_dispatch` inputs:

| Input | Effect |
| --- | --- |
| `target_repo` | Selects one exact target within checked-in owner and repository scope. |
| `safe_output_repo` | Selects an allowed private review destination for this run. |
| `max_repos` | Narrows the checked-in package repository ceiling. |
| `rollout_percent` | Narrows the checked-in package rollout ceiling. |
| `safe_output_mode` | Narrows `live` policy to `review`, or requests the already-authorized mode. |

Manual inputs affect only one run. They do not update `.github/central-agentic-ops.json`. Use `gh aw run <workflow-name>` to trigger an installed workflow so gh-aw validates and records its inputs correctly.

## Ops Publish Add-on

Ops Publish reads `control-plane.publishing` and `control-plane.scope` from the same JSON policy. `publishing.enabled` defaults to `false`; when enabled, `publishing.reviewers` must be non-empty. `publishing.control-repositories` defaults to the repository containing the add-on.

PAT fallback uses the separate `CENTRAL_AGENTIC_OPS_PUBLISH_CONTROL_TOKEN` and `CENTRAL_AGENTIC_OPS_PUBLISH_TARGET_TOKEN` secrets. These credentials are not policy and never override owner, repository, reviewer, or target-authority checks. See [Ops Publish](operations.md#publishing-reviewed-operation-issues).

## Markdown Steering

Each workflow may load optional repository-specific instructions from `.github/cao/<operation>.md` in the control repository. Supported operation names are `advisory`, `ambient-context`, `aw-maintenance`, `dependabot`, `eu-cra-compliance`, and `optimization`.

Steering can refine evidence, priorities, and selection within resolved policy. It cannot grant tools, credentials, permissions, repository reach, or safe-output capabilities. Package updates do not overwrite these files.

## Optional Observability

The dispatcher span is built into `shared/control.md`; exporter configuration determines where gh-aw sends it. Set the `GH_AW_DEFAULT_OTLP_ENDPOINT` Actions variable and `GH_AW_DEFAULT_OTLP_HEADERS` Actions secret at repository, organization, or enterprise scope. Export is disabled when the endpoint or matching headers are absent.

```bash
CONTROL_REPO="acme/central-agentic-ops"
gh variable set GH_AW_DEFAULT_OTLP_ENDPOINT \
  --repo "$CONTROL_REPO" \
  --body "https://collector.example.com/v1/traces"
gh secret set GH_AW_DEFAULT_OTLP_HEADERS --repo "$CONTROL_REPO"
```

At the secret prompt, enter the complete exporter header string, such as `Authorization=Bearer <token>` or `Authorization=Basic <credentials>,X-Scope-OrgID=<tenant>`.

The optional `shared/sentry.md`, `shared/grafana.md`, and `shared/datadog.md` imports configure exporters only; they do not create the dispatcher span. Their headers are:

| Provider | Header |
| --- | --- |
| Sentry | `Authorization: <GH_AW_OTEL_SENTRY_AUTHORIZATION>` |
| Grafana Cloud | `Authorization: <GH_AW_OTEL_GRAFANA_AUTHORIZATION>` |
| Datadog | `DD-API-KEY: <GH_AW_OTEL_DATADOG_API_KEY or DD_API_KEY>` |

Installed Central Agentic Ops packages do not include these optional provider files by default. Use the default OTLP variable and secret unless an installed package deliberately carries a provider import, then recompile all affected workflows.

## Sources of Truth

- Policy schema and resolution: `.github/scripts/control-policy/resolve.mjs` and [Control Policy Specification](control-policy-specification.md)
- Checked-in control policy: `.github/central-agentic-ops.json`
- Shared runtime enforcement: `.github/workflows/shared/control-precompute.md`
- Package inventory: the root and package `aw.yml` manifests
- Credentials and permissions: [Configure Authentication](authentication.md)