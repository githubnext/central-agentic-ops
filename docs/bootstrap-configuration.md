---
title: Optional Bootstrap Setup
description: Use aw.yml config to guide least-privilege GitHub App, PAT, and repository configuration during installation.
---

A package can optionally declare an ordered `config:` list in its source `aw.yml`. When an operator installs that package with `gh aw add-wizard`, gh-aw installs the workflows, prompts for missing configuration, and writes repository variables and secrets to the control repository.

```bash
gh aw add-wizard githubnext/central-agentic-ops/dependabot@<catalog-release>
```

Use `add-wizard` for a package with `config:`. The non-interactive `gh aw add` command rejects these packages because it cannot safely collect their configuration.

The current Central Agentic Ops manifests do not declare `config:`. Keep bootstrap setup opt-in while the feature is experimental so normal package installation remains unchanged. Add it only to a package that deliberately chooses a guided authentication path and has tested the full wizard flow.

:::note[Experimental manifest feature]
gh-aw currently reports `config:` as experimental. The `--no-config` flag disables inferred GitHub App permissions and events; it does not skip declared setup actions. A whole profile is optional only when the package omits `config:`. Within a profile, `optional: true` is supported for `repo-variable` and `repo-secret`, but not for `github-app`.
:::

Preserving the default manual path also keeps all three supported authentication choices available: built-in token for bounded public review runs, GitHub App, and fine-grained PAT. Use the patterns below only when that tradeoff is appropriate for a specific package.

## Prefer a GitHub App Profile

Use the dedicated `github-app` action when a package requires private or cross-repository access. The wizard can create a private App through GitHub's manifest flow or accept an existing App's client ID and private key.

```yaml title="dependabot/aw.yml"
name: Dependabot
min-version: v0.87.6
includes:
  - .github/workflows/dependabot.md
config:
  - type: require-owner-type
    value: org
  - type: github-app
    owner: repo
    app-name: Central Agentic Ops Dependabot
    app-id-variable: GH_AW_GITHUB_APP_ID
    private-key-secret: GH_AW_GITHUB_APP_PRIVATE_KEY
  - type: repo-variable
    name: CENTRAL_AGENTIC_OPS_ALLOWED_OWNERS
    prompt: Comma-separated target repository owners
  - type: repo-variable
    name: CENTRAL_AGENTIC_OPS_DEPENDABOT_MODE
    prompt: Dependabot rollout mode
    default: review
    enum: [review, live]
  - type: repo-variable
    name: CENTRAL_AGENTIC_OPS_DEPENDABOT_MAX_REPOS
    prompt: Maximum repositories per scheduled run
    default: "1"
  - type: handoff
    message: Run one reviewed operation against one repository before promotion.
```

Do not copy a broad `permissions:` list into the App action. gh-aw `v0.87.2` and later infer the minimum App permissions and webhook events from only the workflows resolved for that package, including their safe outputs. The wizard merges explicitly declared requirements with inferred requirements and shows the resulting App manifest before opening GitHub's creation flow. Current Central Agentic Ops packages require `v0.87.6` or later.

Declare `permissions:` or `events:` only for requirements that cannot be inferred from package workflows. Explicit values supplement inference; they do not narrow it. If inferred access is too broad, narrow the workflow frontmatter or split the package.

The created App is private, does not request OAuth authorization on installation, and has its webhook disabled. Install it only on repositories enrolled for this operation. The wizard stores the App client ID in `GH_AW_GITHUB_APP_ID` and the PEM private key in `GH_AW_GITHUB_APP_PRIVATE_KEY`; it does not expose the key as a repository variable.

To require an existing App instead of offering creation, set:

```yaml
  - type: github-app
    mode: existing
    app-id-variable: GH_AW_GITHUB_APP_ID
    private-key-secret: GH_AW_GITHUB_APP_PRIVATE_KEY
```

## Use a Fine-Grained PAT Profile

Use a `repo-secret` action when a package deliberately supports PAT-only setup:

```yaml title="aw.yml"
config:
  - type: require-owner-type
    value: org
  - type: repo-secret
    name: GH_AW_GITHUB_TOKEN
    prompt: Fine-grained PAT for control-plane GitHub access
    description: Limit the token to enrolled repositories and package-required permissions.
  - type: repo-variable
    name: CENTRAL_AGENTIC_OPS_ALLOWED_OWNERS
    prompt: Comma-separated target repository owners
  - type: handoff
    message: Run one reviewed operation against one repository before promotion.
```

Create the PAT before running the wizard. Select only the control and target repositories needed by the package, then grant only the permissions listed in [Configure Authentication](authentication.md#permissions). Do not use a classic PAT or an organization-wide token as a shortcut.

:::caution[The wizard cannot verify PAT scope]
`repo-secret` securely stores the supplied value, but it does not mint a PAT or inspect its repository selection and permissions. Least privilege remains an operator decision. Validate access with a review run before enabling live mode.
:::

Central Agentic Ops workflows already declare `copilot-requests: write` and use organization billing for inference. Do not add a `copilot-auth` action or create a separate Copilot PAT for these packages.

## Offer App or PAT

One manifest cannot branch between `github-app` and PAT actions, and a `github-app` action is not optional. A package that must accept either existing App credentials or a PAT can prompt for all three values as optional fields:

```yaml title="aw.yml"
config:
  - type: repo-variable
    name: GH_AW_GITHUB_APP_ID
    prompt: Existing GitHub App client ID
    description: Leave empty when using a PAT.
    optional: true
  - type: repo-secret
    name: GH_AW_GITHUB_APP_PRIVATE_KEY
    prompt: Existing GitHub App private key
    description: Leave empty when using a PAT.
    optional: true
  - type: repo-secret
    name: GH_AW_GITHUB_TOKEN
    prompt: Fine-grained PAT fallback
    description: Leave empty when both GitHub App values are configured.
    optional: true
  - type: handoff
    message: Configure the complete App pair or GH_AW_GITHUB_TOKEN before operational runs.
```

This compatibility profile cannot create an App or enforce that exactly one complete authentication method was supplied. Prefer the dedicated App profile for an opinionated package. Omit authentication actions when the package intentionally supports the [public read-only profile](authentication.md#public-read-only-profile).

## Validate the Profile

Before publishing a package with `config:`:

1. Run `npm run compile` to validate every manifest and workflow.
2. Install the package by pinned release or commit into a disposable private control repository.
3. Confirm existing variables and secrets are detected and left unchanged when the wizard is rerun.
4. Review the App's permissions and selected repositories, or review the fine-grained PAT's repository selection and permissions.
5. Run one explicit target with `max_repos` set to `1` and `safe_output_mode` set to `review`.

`repo-variable` and `repo-secret` actions are idempotent by name: the wizard skips an existing value rather than overwriting it. A `github-app` action is skipped only when both its client ID variable and private key secret exist; a partial pair is not treated as configured. A successful setup still requires the review validation in [Quickstart](getting-started.md#step-5---trigger-one-review-run).