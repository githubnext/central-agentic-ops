---
title: Configure Authentication
description: Choose and configure least-privilege GitHub App, fine-grained PAT, or built-in workflow-token access.
---

Choose the least-powerful authentication profile that can satisfy the effective target scope, package API requirements, mode, and review destination. Control-repository visibility does not determine target access. Use the built-in workflow token for the bounded cases below, prefer a GitHub App for long-lived cross-repository operation, and treat a fine-grained personal access token (PAT) as a consented fallback with additional eligibility limits.

| Your use case | Credential |
| --- | --- |
| Self-review against the control repository | Built-in `GITHUB_TOKEN` |
| Public targets in `review`, with outputs kept in the control repository | Built-in `GITHUB_TOKEN`, subject to cross-repository API limits |
| Private or internal targets, alternate review repositories, or cross-repository live writes | GitHub App |
| GitHub App installation is unavailable and the exact scope is PAT-compatible | Fine-grained PAT, only after informed consent |

```text
Can GITHUB_TOKEN satisfy this bounded self-review or public-only review?
	|
	+-- yes --> built-in GITHUB_TOKEN
	|
	+-- no ---> Can a GitHub App be installed for every required organization?
	             |
	             +-- yes --> GitHub App
	             |
	             +-- no ---> Is one fine-grained PAT eligible for the exact scope and APIs?
	                          |
	                          +-- yes --> explain tradeoffs, obtain consent, then configure PAT
	                          |
	                          +-- no ---> stop, narrow or split the scope, or request owner help
```

:::tip[Default to a GitHub App]
Choose a GitHub App unless the built-in token fully covers the bounded run. GitHub Apps use short-lived, installation-scoped tokens, are independent of an individual user's continued access, and scale across approved repository and organization installations.
:::

## Copilot Engine Authentication

Copilot inference authentication is separate from GitHub API and target-repository authentication. CAO requires organization billing: every Copilot-backed workflow declares `copilot-requests: write`, and gh-aw compiles it to use the built-in `${{ github.token }}` for inference. This static workflow contract supports non-interactive `gh aw add` without install-time source rewriting.

Before installation, require API evidence of an active organization entitlement or explicit confirmation from an organization administrator when the billing endpoint is inaccessible or inconclusive. Stop when organization billing is unavailable. CAO does not support `COPILOT_GITHUB_TOKEN` inference fallback, runtime token precedence, or mixed authentication profiles. A GitHub App, `GH_AW_GITHUB_TOKEN`, OAuth token, or target-access PAT serves a different authorization boundary and cannot authenticate Copilot inference for CAO.

## Policy

Target-repository authentication is defined once in `.github/workflows/shared/control.md` and inherited by Orchestrator and worker workflows. Copilot inference permission remains explicit in every Copilot-backed workflow. Workflow-local GitHub App blocks should not be added unless a future Agentic Workflow has a documented isolation requirement that shared control cannot satisfy.

The supported control-plane credentials are:

| Priority | Credential | Configuration |
| --- | --- | --- |
| 1 | GitHub App | Protected `central-agentic-ops` environment secrets `GH_AW_GITHUB_APP_ID` and `GH_AW_GITHUB_APP_PRIVATE_KEY` |
| 2 | Fine-grained PAT | Protected `central-agentic-ops` environment secret `GH_AW_GITHUB_TOKEN` |
| 3 | Workflow token | Repository-provided `GITHUB_TOKEN` for operations it can authorize |

This is runtime availability precedence, not permission to choose a PAT silently. `ignore-if-missing: true` makes the App optional: when an App token is unavailable, shared control falls through to `GH_AW_GITHUB_TOKEN`, then `GITHUB_TOKEN`. The runtime cannot determine why a PAT secret exists or record informed consent. Setup must choose and validate the authentication profile before a run; if App authentication is intended, verify both App secrets rather than relying on fallback behavior.

Configure the App ID and private key as protected environment secrets:

```bash
CONTROL_REPO="acme/central-agentic-ops"

printf '%s' '<github-app-id>' | gh secret set GH_AW_GITHUB_APP_ID --env central-agentic-ops --repo "$CONTROL_REPO"
gh secret set GH_AW_GITHUB_APP_PRIVATE_KEY \
	--env central-agentic-ops \
	--repo "$CONTROL_REPO" \
	< github-app-private-key.pem
```

The private key command reads the key from a local file without placing it in shell history.

When manual workflow steps need `GH_TOKEN`, they select the imported App token first when available, then `GH_AW_GITHUB_TOKEN`, then `GITHUB_TOKEN`. Missing, incomplete, or invalid credentials must not be copied into dispatch inputs or persisted in artifacts.

## API Capacity Admission

Before activation, shared control checks the primary REST API capacity of the exact credential selected for control precompute. The check uses GitHub's `GET /rate_limit` endpoint, which [does not consume primary rate-limit capacity](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api#checking-the-status-of-your-rate-limit). Admission reserves at least 100 core requests and raises that requirement for broader configured inventory scans.

When capacity is insufficient, the run stops before repository discovery. The admission summary reports remaining and required requests, the UTC reset timestamp, and the approximate minutes and hours until reset. The dashboard exposes the latest failure as a GitHub API capacity admission gate rather than an undifferentiated workflow failure.

Follow this order:

1. Do not rerun before the reported reset time. GitHub directs integrations with zero remaining capacity to wait until `x-ratelimit-reset`; repeated requests while limited can result in integration blocking. See [rate limits for the REST API](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api#exceeding-the-rate-limit) and [REST API best practices](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api#handle-rate-limit-errors-appropriately).
2. For long-lived cross-repository automation, configure the least-privilege GitHub App profile. Follow [GitHub's guide to authenticated App requests in Actions](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/making-authenticated-api-requests-with-a-github-app-in-a-github-actions-workflow). Shared control requests only `Actions: read` and `Contents: read` for pre-activation and still applies the checked-in CAO scope.
3. If an App cannot be installed and the exact scope is PAT-compatible, use a fine-grained PAT only after informed consent. Follow [GitHub's fine-grained PAT guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token), restrict it to required repositories and permissions, set an expiration, and store it as the protected `GH_AW_GITHUB_TOKEN` [Actions secret](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions).

## Fine-Grained PAT Fallback

A PAT is not a substitute for repository or organization access. It can only exercise access already held by the user who created it, and it becomes unusable when that user loses the underlying access. Lack of organization-owner permission to install an App does not by itself make a PAT viable.

Before offering a PAT fallback, verify all of these conditions:

1. The user can select the target organization as the PAT resource owner and already has the required access to every enrolled repository.
2. Organization and enterprise policy permits fine-grained PATs, and any required organization approval can be obtained before the first run.
3. All repositories covered by the token have one resource owner. A fine-grained PAT cannot access multiple organizations at once; with CAO's single `GH_AW_GITHUB_TOKEN` fallback, a multi-organization scope requires a GitHub App, narrower control planes, or separate credential architecture.
4. Every API required by the installed package supports fine-grained PATs. Fine-grained PATs do not currently support every endpoint, including the Checks API; do not replace a required App with a classic PAT to work around an endpoint gap.
5. The PAT can be limited to the exact enrolled repositories, package-required permissions, and an explicit expiration and rotation owner.

If any condition fails, stop and recommend obtaining a GitHub App installation, narrowing or splitting the scope, or involving an organization owner. Do not present a PAT as an access bypass.

Before selecting, configuring, validating, or using a PAT, explain that it is user-bound, longer-lived than an App installation token, limited to one resource owner, subject to organization policy and endpoint gaps, and dependent on manual rotation and revocation. Obtain explicit confirmation to proceed. Inability to use an App, or the presence of an existing PAT secret, is not consent.

## Public Read-Only Profile

An App or PAT is not required for a bounded `review` run when every target repository is public and outputs remain in the current control repository. GitHub Actions automatically provides `GITHUB_TOKEN`; the workflows use it for control-repository workflow discovery, public checkout, and review outputs authorized in the control repository. This is built-in-token operation, not anonymous or credential-free operation.

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

- Credentials live only in the control-plane repository's protected `central-agentic-ops` environment secrets.
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
gh secret set GH_AW_GITHUB_TOKEN --env central-agentic-ops --repo "acme/central-agentic-ops"
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
- PAT-only authentication only when the App is intentionally absent, the fallback is eligible, and the operator explicitly consented;
- expected precedence when both are configured;
- target repository coverage;
- organization PAT policy, approval state, resource-owner scope, expiration, and required API compatibility when using a PAT;
- read operations for repository and workflow discovery;
- a review output in the intended control repository without credential material;
- authentication-profile review whenever target scope, package API requirements, mode, or review destination changes.
