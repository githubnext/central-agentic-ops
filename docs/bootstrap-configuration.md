---
title: Optional Bootstrap Setup
description: Use aw.yml config to collect credential secrets without creating a second policy channel.
---

A package may declare an ordered `config:` list in its source `aw.yml`. `gh aw add-wizard` installs the workflows and prompts for missing bootstrap credentials. It does not create or update `.github/central-agentic-ops.json`.

```bash
gh aw add-wizard githubnext/central-agentic-ops/dependabot@<catalog-release>
```

The current Central Agentic Ops manifests do not declare `config:`. Keep setup opt-in while the feature is experimental so normal package installation remains unchanged.

:::caution[Bootstrap is not policy]
Persistent scope, inventory, package, worker, mode, rollout, and budget settings belong only in `.github/central-agentic-ops.json`. Do not add `CENTRAL_AGENTIC_OPS_*` repository variables to an installer profile.
:::

## Credential-Only Profile

Central Agentic Ops reads the GitHub App ID and private key from Actions secrets. A package that deliberately adopts guided setup can collect those values without adding a policy variable:

```yaml title="dependabot/aw.yml"
name: Dependabot
min-version: v0.87.6
includes:
  - .github/workflows/dependabot.md
config:
  - type: require-owner-type
    value: org
  - type: repo-secret
    name: GH_AW_GITHUB_APP_ID
    prompt: Existing GitHub App client ID
    optional: true
  - type: repo-secret
    name: GH_AW_GITHUB_APP_PRIVATE_KEY
    prompt: Existing GitHub App private key
    optional: true
  - type: repo-secret
    name: GH_AW_GITHUB_TOKEN
    prompt: Fine-grained PAT fallback
    description: Limit the token to enrolled repositories and package-required permissions.
    optional: true
  - type: handoff
    message: Commit .github/central-agentic-ops.json, then run one reviewed operation against one repository.
```

Supply either both App secrets or the PAT secret before an operational run. The installer cannot verify an App installation or PAT repository scope, so validate access in `review` before enabling `live`.

The dedicated `github-app` bootstrap action stores its client ID as a repository variable. Do not use that action while Central Agentic Ops intentionally consumes a secret-only App pair.

## Fine-Grained PAT Profile

A PAT-only package can use the smaller profile:

```yaml title="aw.yml"
config:
  - type: require-owner-type
    value: org
  - type: repo-secret
    name: GH_AW_GITHUB_TOKEN
    prompt: Fine-grained PAT for control-plane GitHub access
    description: Limit the token to enrolled repositories and package-required permissions.
  - type: handoff
    message: Commit .github/central-agentic-ops.json, then run one reviewed operation against one repository.
```

Create the PAT before running the wizard. Select only the control and target repositories needed by the package, then grant only the permissions in [Configure Authentication](authentication.md#permissions). Do not use a classic PAT or organization-wide token as a shortcut.

The [public read-only profile](authentication.md#public-read-only-profile) needs no App or PAT bootstrap when all targets are public and review outputs stay in the control repository.

## Validate the Profile

Before publishing a package with `config:`:

1. Run `npm run compile`.
2. Install the package by pinned release or commit into a disposable private control repository.
3. Confirm existing secrets are detected and left unchanged when the wizard is rerun.
4. Commit a valid `.github/central-agentic-ops.json` declaring the package and workers.
5. Review the App or PAT repository selection and permissions.
6. Run one explicit target with `max_repos` set to `1` and `safe_output_mode` set to `review`.

`repo-secret` actions are idempotent by name: the wizard skips an existing secret rather than overwriting it. A successful bootstrap still requires the review validation in [Quickstart](getting-started.md#step-5---trigger-one-review-run).