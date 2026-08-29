---
title: Configure Authentication
description: Choose and configure least-privilege GitHub App, fine-grained PAT, or built-in workflow-token access.
---

Configure authentication for the repositories each operation needs to access. Prefer a GitHub App for private or cross-repository use; use a fine-grained PAT when an App is not practical; use the built-in workflow token only for the bounded cases described below.

Package maintainers can optionally turn these settings into a guided `gh aw add-wizard` flow with [`aw.yml` bootstrap configuration](bootstrap-configuration.md).

| Your use case | Credential |
| --- | --- |
| Private or internal targets, alternate review repositories, or live writes | GitHub App preferred; fine-grained PAT supported |
| Public targets with review outputs kept in the control repository | Built-in token only when its repository permissions authorize the output |

```text
Does the run need a private target, cross-repository data, or live writes?
	|
	+-- yes --> GitHub App (preferred) or fine-grained PAT
	|
	+-- no ---> Public target reviewed in the control repository --> built-in GITHUB_TOKEN
```

:::tip[Default to a GitHub App]
Choose a GitHub App unless you are deliberately validating the public read-only profile. Its short-lived tokens and installation-scoped repository access make review and revocation easier.
:::

## Policy

Authentication is defined once in `.github/workflows/shared/control.md` and inherited by Orchestrator and worker workflows. Workflow-local GitHub App blocks should not be added unless a future Agentic Workflow has a documented isolation requirement that shared control cannot satisfy.

The supported control-plane credentials are:

| Priority | Credential | Configuration |
| --- | --- | --- |
| 1 | GitHub App | Repository secrets `GH_AW_GITHUB_APP_ID` and `GH_AW_GITHUB_APP_PRIVATE_KEY` |
| 2 | Fine-grained PAT | Repository secret `GH_AW_GITHUB_TOKEN` |
| 3 | Workflow token | Repository-provided `GITHUB_TOKEN` for operations it can authorize |

The GitHub App is preferred because it provides short-lived installation tokens, repository-scoped installation access, and centrally reviewable permissions. `ignore-if-missing: true` makes App configuration optional, allowing PAT-only installations.

Configure the App ID and private key as repository secrets:

```bash
CONTROL_REPO="acme/central-agentic-ops"

printf '%s' '<github-app-id>' | gh secret set GH_AW_GITHUB_APP_ID --repo "$CONTROL_REPO"
gh secret set GH_AW_GITHUB_APP_PRIVATE_KEY \
	--repo "$CONTROL_REPO" \
	< github-app-private-key.pem
```

The private key command reads the key from a local file without placing it in shell history.

When manual workflow steps need `GH_TOKEN`, they select the imported App token first, then `GH_AW_GITHUB_TOKEN`, then `GITHUB_TOKEN`. Missing, incomplete, or invalid credentials must not be copied into dispatch inputs or persisted in artifacts.

## Public Read-Only Profile

An App or PAT is not required for a bounded `review` run when every target repository is public and outputs remain in the private control repository. GitHub Actions automatically provides `GITHUB_TOKEN`; the workflows use it for control-repository workflow discovery, public checkout, and review outputs authorized in the control repository. This is built-in-token operation, not anonymous or credential-free operation.

:::caution[Public does not mean fully readable]
The built-in token may check out public code, but it does not automatically gain access to another repository's Actions logs, security data, issues, pull requests, or write APIs.
:::

Keep this profile within these boundaries:

- use `review` mode and keep safe outputs in the current control repository;
- keep target owners allowlisted and all repository and dispatch caps in force;
- treat unavailable cross-repository API data, including Actions logs or security data, as incomplete rather than weakening the requested analysis;
- configure an App or PAT for private or internal targets, an alternate review repository, or any `live` cross-repository write.

The workflow token is scoped to the repository containing the workflow. Public checkout does not grant target-repository write access, and a public repository's visibility does not expand the token's Actions, security, issue, or pull-request permissions. If a worker cannot read required target evidence with the available token, it must report incomplete and produce no speculative result.

## Credential Boundary

- Credentials live only in the private control-plane repository's secrets.
- worker workflows receive repository names and routing policy, never credentials.
- Each Orchestrator and worker workflow run resolves its own token through imported shared control.
- Tokens must not appear in prompts, logs, safe outputs, Repo Memory, review bundles, or correlation metadata.
- For operations outside the public read-only profile, the App installation or PAT repository selection must cover every repository the enabled operations may read or update.

## Permissions

Grant only permissions required by installed operations. The current full catalog may require:

| Permission | Access | Reason |
| --- | --- | --- |
| Actions | Read | Discover workflows and inspect runs |
| Contents | Read and write | Read target repositories and create approved repository changes |
| Issues | Read and write | Inspect issues and create issue or comment safe outputs |
| Pull requests | Read and write | Inspect dependency work and create pull request safe outputs |
| Workflows | Read and write | Dispatch installed worker workflows and update workflow files where explicitly allowed |
| Security events | Read | Inspect code-security evidence |
| Dependabot alerts | Read | Prioritize dependency security work |
| Metadata | Read | Required repository metadata access |

A package-only installation should narrow these permissions to that package's workflows. Fine-grained PATs should be limited to the same repositories and permissions.

Example PAT fallback configuration:

```bash
gh secret set GH_AW_GITHUB_TOKEN --repo "acme/central-agentic-ops"
```

The GitHub CLI prompts for the token without echoing it. Do not include the token directly in the command.

## Rotation and Revocation

For a GitHub App:

1. Add the replacement private key to the existing repository secret.
2. Validate review runs for each installed operation.
3. Revoke the old private key.
4. Recheck App installation repository access and permissions.

For a PAT:

1. Create a replacement fine-grained PAT with the same or narrower repository access.
2. Replace `GH_AW_GITHUB_TOKEN`.
3. Validate review runs.
4. Revoke the previous PAT.

For suspected credential exposure, set affected package kill switches to `false`, cancel active runs, revoke the credential, inspect GitHub Actions logs and safe outputs, rotate credentials, and resume in review mode.

:::danger[Suspected exposure]
Stopping an operation does not revoke its credential. Disable affected runs and revoke the App installation or PAT before investigating further.
:::

## Validation

Before promotion, verify:

- App-only authentication when an App is configured;
- PAT-only authentication when the App is intentionally absent;
- expected precedence when both are configured;
- target repository coverage;
- read operations for repository and workflow discovery;
- a review output in the intended private repository without credential material.
