---
title: Quickstart
description: Create a private control plane, install one operation, and run it safely against one repository.
---

Central Agentic Ops lets you run governed agentic operations across many repositories from one private GitHub repository, which we call the central control plane. Operation packages, credentials, rollout policy, and workflow runs stay in the control plane; target repositories do not receive copies of the workflows.

By the end of this guide, you will have created a control plane, installed the Dependabot operation, and completed one `staged` run against a public target repository. You will verify that the operation selected the expected target and proposed work without changing it.

## Run a Staged Dependabot Operation

Estimated time: 15 minutes

This quickstart uses one public repository owned by the same organization as the control repository. That path requires no GitHub App or personal access token.

## Prerequisites

Before you begin, make sure you have:

- a GitHub organization where you can create a private repository;
- one low-risk public repository in that organization to use as the target;
- GitHub Actions enabled for both repositories;
- [GitHub CLI](https://cli.github.com/) installed and authenticated;
- access to GitHub Copilot through organization billing for Agentic Workflow runs.

Check your GitHub CLI authentication:

```bash
gh auth status
```

If needed, sign in with repository and workflow access:

```bash
gh auth login --scopes repo,workflow
```

:::note[Using a private or cross-organization target?]
Complete [Configure Authentication](authentication.md) before running the operation. The credential must cover the target repository, and its owner must be allowlisted.
:::

### Step 1 - Create the control repository

Choose names for the private control repository and public target repository. Replace the examples below with repositories you own:

```bash
CONTROL_REPO="acme/central-agentic-ops"
TARGET_REPO="acme/example-service"

gh repo create "$CONTROL_REPO" --private --clone
cd "${CONTROL_REPO##*/}"
```

The new private repository is the central control plane. Agentic Workflow definitions and credentials stay here; they are not installed in the target repository.

:::caution[Keep the control plane private]
The control repository holds credentials, rollout policy, and cross-repository operating records. Do not make it public.
:::

### Step 2 - Install the `gh-aw` extension

Install GitHub Agentic Workflows:

```bash
gh extension install github/gh-aw
```

If the extension is already installed, verify that it is available:

```bash
gh aw --help
```

### Step 3 - Add the Dependabot operation

From the control repository, install the Dependabot operation package from a pinned catalog release. Replace `<catalog-release>` with a release tag or full commit SHA:

```bash
gh aw add-wizard githubnext/central-agentic-ops/dependabot@<catalog-release>
```

The package installs:

1. the **Dependabot** orchestrator, which selects repositories;
2. the **Dependabot / Release Train Updater** worker, which analyzes one selected repository;
3. shared authentication, routing, and fail-closed controls;
4. generated `.lock.yml` workflows that GitHub Actions executes.

Keep the operation in `staged` mode when the wizard asks for its rollout settings. Then commit and push the installed files:

```bash
git add .github
git commit -m "Install Dependabot operation"
git push --set-upstream origin HEAD
```

Do not edit generated `.lock.yml` files directly. Update their Markdown sources and regenerate them with `gh aw compile`.

### Step 4 - Set the first-run boundary

Configure the target owner, keep the scheduled operation staged, and cap scheduled selection at one repository:

```bash
TARGET_OWNER="${TARGET_REPO%%/*}"

gh variable set CENTRAL_AGENTIC_OPS_ALLOWED_OWNERS --body "$TARGET_OWNER"
gh variable set CENTRAL_AGENTIC_OPS_DEPENDABOT_MODE --body "staged"
gh variable set CENTRAL_AGENTIC_OPS_DEPENDABOT_MAX_REPOS --body "1"
```

These variables configure future scheduled runs. The manual run in the next step also names one explicit target and requests `staged` mode.

### Step 5 - Trigger one staged run

Run the installed orchestrator against the target repository:

```bash
gh workflow run dependabot.lock.yml \
	--raw-field target_repo="$TARGET_REPO" \
	--raw-field max_repos="1" \
	--raw-field rollout_percent="100" \
	--raw-field safe_output_mode="staged"
```

You can also open the control repository's **Actions** tab, select **Dependabot**, and choose **Run workflow** with the same values.

The orchestrator should select only the named repository and dispatch at most one updater. In `staged` mode, proposed safe outputs are recorded without creating or changing issues, pull requests, branches, or files.

### Step 6 - Wait for the operation to complete

List the latest Dependabot runs:

```bash
gh run list --workflow dependabot.lock.yml --event workflow_dispatch --limit 5
```

Copy the run ID from the first row, then watch it until completion:

```bash
gh run watch <run-id> --exit-status
```

The orchestrator may dispatch a separate updater run. Open the orchestrator run in the **Actions** tab to follow its correlated worker and inspect the staged output.

## Verify the Result

A successful first run proves the boundary:

- the orchestrator selected exactly `TARGET_REPO`;
- no more than one updater was dispatched;
- the worker remained in `staged` mode;
- the staged output links back to the control-plane run;
- no issue, pull request, branch, or file was written to the target repository.

The worker may report that no dependency work is needed. That is still a successful first run when target selection, routing, and zero-write behavior are correct.

Having trouble? Check [Configure Authentication](authentication.md) for repository access, [Configuration](configuration.md) for owner and mode settings, or [Monitor and Recover](operations.md) for failed runs.

## What's Next?

- Learn how to promote the operation through [staged, review, and live](rollout-and-routing.md).
- Read [How the Control Plane Works](architecture.md) before adding organizations or broader repository discovery.
- Use the [Configuration Reference](configuration.md) to tune schedules, repository limits, and worker ceilings.
- Review [Orchestrators and Workers](orchestrators-and-workers.md) before creating another operation.