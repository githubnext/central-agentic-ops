# Authentication

## Policy

Authentication is defined once in `.github/workflows/shared/control.md` and inherited by Orchestrator and worker workflows. Workflow-local GitHub App blocks should not be added unless a future Agentic Workflow has a documented isolation requirement that shared control cannot satisfy.

The supported control-plane credentials are:

| Priority | Credential | Configuration |
| --- | --- | --- |
| 1 | GitHub App | Repository variable `GH_AW_GITHUB_APP_ID` and secret `GH_AW_GITHUB_APP_PRIVATE_KEY` |
| 2 | Fine-grained PAT | Repository secret `GH_AW_GITHUB_TOKEN` |
| 3 | Workflow token | Repository-provided `GITHUB_TOKEN` for operations it can authorize |

The GitHub App is preferred because it provides short-lived installation tokens, repository-scoped installation access, and centrally reviewable permissions. `ignore-if-missing: true` makes App configuration optional, allowing PAT-only installations.

When manual workflow steps need `GH_TOKEN`, they select the imported App token first, then `GH_AW_GITHUB_TOKEN`, then `GITHUB_TOKEN`. Missing, incomplete, or invalid credentials must not be copied into dispatch inputs or persisted in artifacts.

## Public Read-Only Profile

An App or PAT is not required for a bounded `staged` scan when every target repository is public. GitHub Actions automatically provides `GITHUB_TOKEN`; the workflows use it for control-repository workflow discovery and can check out other public repositories. This is built-in-token operation, not anonymous or credential-free operation.

Keep this profile within these boundaries:

- use `staged` mode for public target analysis;
- keep target owners allowlisted and all repository and dispatch caps in force;
- treat unavailable cross-repository API data, including Actions logs or security data, as incomplete rather than weakening the requested analysis;
- use `review` only when safe outputs remain in the current control repository and its `GITHUB_TOKEN` permissions authorize the output;
- configure an App or PAT for private or internal targets, an alternate review repository, or any `live` cross-repository write.

The workflow token is scoped to the repository containing the workflow. Public checkout does not grant target-repository write access, and a public repository's visibility does not expand the token's Actions, security, issue, or pull-request permissions. If a worker cannot read required target evidence with the available token, it must report incomplete and produce no speculative result.

## Credential Boundary

- Credentials live only in the private control-plane repository's variables and secrets.
- worker workflows receive repository names and routing policy, never credentials.
- Each Orchestrator and worker workflow run resolves its own token through imported shared control.
- Tokens must not appear in prompts, logs, safe outputs, Repo Memory, review bundles, or correlation metadata.
- For operations outside the public read-only profile, the App installation or PAT repository selection must cover every repository the enabled bundles may read or update.

## Permissions

Grant only permissions required by installed bundles. The current full catalog may require:

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

## Rotation and Revocation

For a GitHub App:

1. Add the replacement private key to the existing repository secret.
2. Validate staged runs for each installed bundle.
3. Revoke the old private key.
4. Recheck App installation repository access and permissions.

For a PAT:

1. Create a replacement fine-grained PAT with the same or narrower repository access.
2. Replace `GH_AW_GITHUB_TOKEN`.
3. Validate staged runs.
4. Revoke the previous PAT.

For suspected credential exposure, disable scheduled Agentic Workflows or set bundles to an unrecognized/empty mode, revoke the credential, inspect GitHub Actions logs and safe outputs, rotate credentials, and resume from staged mode.

## Validation

Before promotion, verify:

- App-only authentication when an App is configured;
- PAT-only authentication when the App is intentionally absent;
- expected precedence when both are configured;
- target repository coverage;
- read operations for repository and workflow discovery;
- a staged safe output without credential material.
