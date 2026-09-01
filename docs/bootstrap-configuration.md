---
title: Bootstrap Setup
description: Use aw.yml config to select authentication and collect credentials without creating a second policy channel.
---

A package may declare an ordered `config:` list in its source `aw.yml`. `gh aw add-wizard` installs the workflows and runs those bootstrap actions. It does not create or update `.github/central-agentic-ops.json`.

```bash
gh aw add-wizard githubnext/central-agentic-ops@<catalog-release>
```

The root Central Agentic Ops manifest declares this Copilot inference action:

```yaml title="aw.yml"
config:
  - type: copilot-auth
    secret: COPILOT_GITHUB_TOKEN
    strategy: prompt-if-actions-auth-unavailable
```

The root workflow sources are authentication-neutral. During installation, the action offers organization billing first when available. That selection adds `copilot-requests: write` to every installed Copilot workflow before compilation and uses the built-in workflow token. If organization billing is unavailable, offer the PAT selection only after explicit consent; it leaves that permission absent, collects `COPILOT_GITHUB_TOKEN` through a hidden prompt, and compiles the workflows to use only that secret.

The root package also installs `.github/aw/default-AGENTS.md`. gh-aw package resources cannot own files outside `.github/`, and its bootstrap registry has no file-copy action, so `add-wizard` ends with a handoff explaining how to create root `AGENTS.md`. The CAO setup skill materializes the template only when that file is absent. Existing root agent instructions are consumer-owned and must be reviewed rather than overwritten. Package updates refresh the reference template without replacing the materialized file.

This source transformation is bootstrap configuration, not runtime precedence. Verify the installed workflows use exactly one profile. Do not hand-edit generated `.lock.yml` files or combine a PAT-first token expression with `copilot-requests: write`.

Choose Copilot inference authentication independently from target-repository authentication in [Configure Authentication](authentication.md). The root `copilot-auth` action handles only inference. Configure a GitHub App or a separately consented `GH_AW_GITHUB_TOKEN` when the selected target scope requires it.

:::caution[Bootstrap is not policy]
Persistent scope, inventory, package, worker, mode, rollout, and budget settings belong only in `.github/central-agentic-ops.json`. Do not add `CENTRAL_AGENTIC_OPS_*` repository variables to an installer profile.
:::

## Target Credential Profile

Central Agentic Ops reads the GitHub App ID and private key from Actions secrets. A package that deliberately adds target-credential bootstrap can collect those values without adding a policy variable:

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
    description: Use only after App-first review and explicit PAT fallback consent; limit access to eligible enrolled repositories and package-required permissions.
    optional: true
  - type: handoff
    message: Commit .github/central-agentic-ops.json, then run one reviewed operation against one repository.
```

Supply both App secrets for the preferred credentialed profile. Use the PAT secret only after the documented eligibility and consent checks. The installer cannot verify an App installation, PAT approval, repository scope, API compatibility, or consent, so validate access in `review` before enabling `live`.

The dedicated `github-app` bootstrap action stores its client ID as a repository variable. Do not use that action while Central Agentic Ops intentionally consumes a secret-only App pair.

## Consented Fine-Grained PAT Profile

A PAT-only package can use the smaller profile only when a GitHub App installation cannot be obtained and the exact scope passes the documented PAT eligibility checks:

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

Before running the wizard, explain the PAT tradeoffs and obtain explicit consent. Then create a fine-grained PAT with one eligible resource owner, an expiration, only the control and target repositories needed by the package, and only the permissions in [Configure Authentication](authentication.md#permissions). Do not use a classic PAT or organization-wide token as a shortcut.

The [public read-only profile](authentication.md#public-read-only-profile) needs no App or PAT bootstrap when all targets are public and review outputs stay in the control repository.

## Validate the Profile

Before publishing or changing a package with `config:`:

1. Run `npm run compile`.
2. Install the package by pinned release or commit into a disposable private control repository.
3. Confirm existing secrets are detected and left unchanged when the wizard is rerun, and confirm the selected Copilot auth profile is applied to every installed Copilot workflow.
4. Commit a valid `.github/central-agentic-ops.json` declaring the package; add worker entries only for exceptions.
5. Review the App or PAT repository selection and permissions.
6. Run one explicit target with `max_repos` set to `1` and `safe_output_mode` set to `review`.

`repo-secret` actions are idempotent by name: the wizard skips an existing secret rather than overwriting it. A successful bootstrap still requires the review validation in [Quickstart](getting-started.md#step-5---trigger-one-review-run).