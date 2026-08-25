---
title: Install and Run Safely
description: Install Central Agentic Ops and validate one bundle against one repository without making changes.
---

Use this guide to reach a safe first result: one installed bundle, one target repository, and one `staged` run that cannot write to GitHub. Keep the control-plane repository private throughout setup.

:::caution[Keep the control plane private]
The control repository holds credentials, rollout policy, and cross-repository operating records. Do not install Central Agentic Ops in a public repository.
:::

## Before You Start

You need:

- a private repository to host the control plane;
- one low-risk target repository for validation;
- permission to configure Actions variables and secrets in the control-plane repository;
- a GitHub App or fine-grained PAT if the target is private or internal.

For public repositories, you can complete a bounded `staged` run with the built-in `GITHUB_TOKEN`. See [Choose credentials](authentication.md) before using private targets, a separate review repository, or `live` mode.

## 1. Choose Your Scope

No GitHub enterprise account is required. An OSS maintainer or organization team can use one private organization-owned control repository when all targets belong to that organization. Use an enterprise-operated repository in a designated organization only when centrally governed workflows must reach repositories across multiple organizations.

If you own multiple organizations without a GitHub enterprise account, create one control repository in each organization and install the same pinned catalog release in each. Keep credentials, enrollment, rollout, and emergency stops organization-local; no relay or coordinating runtime is required.

Automatic discovery enumerates repositories owned by the control repository's organization. Cross-organization targets require explicit fully qualified repository names, an owner allowlist, and a GitHub App or fine-grained PAT with access; automatic enterprise-wide discovery is not provided.

The control plane coordinates installed workflows; it does not replace GitHub rulesets, protected environments, Actions policies, or repository administration. Review [scope and enforcement limits](architecture.md#what-this-does-not-do) before broader adoption.

## 2. Install a Bundle

Install the full catalog or one bundle into the private control-plane repository. The installation provides:

- an orchestrator that selects repositories and dispatches work;
- focused worker workflows;
- shared authentication and fail-closed policy;
- independent rollout settings that default to `staged`.

For example, install the full catalog from a pinned release:

```bash
gh aw add-wizard githubnext/central-agentic-ops@<catalog-release>
```

To start with a smaller surface, replace the package name with a bundle such as `githubnext/central-agentic-ops/dependabot@<catalog-release>`.

After installation, confirm that the generated orchestrator and worker workflows are present and enabled. Pages reporting is optional and is not installed by default.

## 3. Configure the Minimum

1. Add a GitHub App or PAT when the built-in token cannot access the target. Follow [Choose credentials](authentication.md).
2. Confirm the target owner is allowed by `CENTRAL_AGENTIC_OPS_ALLOWED_OWNERS`.
3. Leave the bundle mode at `staged`.
4. Keep `max_repos` at `1` for the first run.

Use the [configuration reference](configuration.md) only when you need the exact variable, secret, or input name.

:::tip[Use a deliberately boring first target]
Choose a low-traffic repository with representative settings and no urgent maintenance work. A quiet target makes unexpected selection or output obvious.
:::

Example first-run profile:

```yaml
control_repository: acme/central-agentic-ops
target_repo: acme/example-service
allowed_owners: acme
max_repos: 1
rollout_percent: 100
safe_output_mode: staged
```

## 4. Run One Staged Check

Open the installed orchestrator in GitHub Actions and select **Run workflow**. Set:

| Input | First-run value |
| --- | --- |
| `target_repo` | The explicit `OWNER/REPO` validation target |
| `max_repos` | `1` |
| `rollout_percent` | `100` |
| `safe_output_mode` | `staged` |
| `safe_output_repo` | Leave empty |

The run should select only the named target, dispatch eligible workers, and stage proposed safe outputs without GitHub API writes.

```text
manual dispatch
	|
	v
select 1 repository --> dispatch eligible workers --> stage proposed outputs
													  (no GitHub writes)
```

## 5. Verify the Result

Before moving beyond `staged`, confirm:

- authentication succeeded without exposing credential data;
- exactly the expected target and workers were selected;
- staged output is useful and contains a link to the orchestrator run;
- no issue, pull request, branch, or file was written to the target;
- AI Credit use and runtime are within the workflow limits.

If any check fails, keep the bundle in `staged` and use [Monitor and recover](operations.md) to diagnose it.

:::note[What success looks like]
The first run is successful when it proves the boundary, even if the worker produces no recommendation. Correct target selection and zero writes matter more than finding work on this run.
:::

## Next Steps

- Understand [staged, review, and live rollout](rollout-and-routing.md) before promotion.
- Use [Configuration](configuration.md) to tune repository limits and schedules.
- Read [How the control plane works](architecture.md) before enterprise-wide adoption.
- Review [orchestrator and worker responsibilities](orchestrators-and-workers.md) before extending a bundle.