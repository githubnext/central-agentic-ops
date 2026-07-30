# Authentication

## Policy

Authentication is defined once in `.github/workflows/shared/control.md` and inherited by orchestrators and workers. Workflow-local GitHub App blocks should not be added unless a future workflow has a documented isolation requirement that shared control cannot satisfy.

The supported control-plane credentials are:

| Priority | Credential | Configuration |
| --- | --- | --- |
| 1 | GitHub App | Repository variable `GH_AW_GITHUB_APP_ID` and secret `GH_AW_GITHUB_APP_PRIVATE_KEY` |
| 2 | Fine-grained PAT | Repository secret `GH_AW_GITHUB_TOKEN` |
| 3 | Workflow token | Repository-provided `GITHUB_TOKEN` for operations it can authorize |

The GitHub App is preferred because it provides short-lived installation tokens, repository-scoped installation access, and centrally reviewable permissions. `ignore-if-missing: true` makes App configuration optional, allowing PAT-only installations.

When manual workflow steps need `GH_TOKEN`, they select the imported App token first, then `GH_AW_GITHUB_TOKEN`, then `GITHUB_TOKEN`. Missing, incomplete, or invalid credentials must not be copied into dispatch inputs or persisted in artifacts.

## Credential Boundary

- Credentials live only in the private control-plane repository's variables and secrets.
- Workers receive repository names and routing policy, never credentials.
- Each orchestrator and worker run resolves its own token through imported shared control.
- Tokens must not appear in prompts, logs, safe outputs, repository memory, review bundles, or correlation metadata.
- The App installation or PAT repository selection must cover every repository the enabled bundles may read or update.

## Permissions

Grant only permissions required by installed bundles. The current full catalog may require:

| Permission | Access | Reason |
| --- | --- | --- |
| Actions | Read | Discover workflows and inspect runs |
| Contents | Read and write | Read target repositories and create approved repository changes |
| Issues | Read and write | Inspect and create safe-output issues or comments |
| Pull requests | Read and write | Inspect dependency work and create safe-output pull requests |
| Workflows | Read and write | Dispatch installed workers and update workflow files where explicitly allowed |
| Security events | Read | Inspect code-security evidence |
| Dependabot alerts | Read | Prioritize dependency security work |
| Metadata | Read | Required repository metadata access |

A package-only installation should narrow these permissions to that package's workflows. Fine-grained PATs should be limited to the same repositories and permissions.

## Rotation and Revocation

For a GitHub App:

1. Add the replacement private key to the existing repository secret.
2. Validate preview runs for each installed bundle.
3. Revoke the old private key.
4. Recheck App installation repository access and permissions.

For a PAT:

1. Create a replacement fine-grained PAT with the same or narrower repository access.
2. Replace `GH_AW_GITHUB_TOKEN`.
3. Validate preview runs.
4. Revoke the previous PAT.

For suspected credential exposure, disable scheduled workflows or set bundles to an unrecognized/empty mode, revoke the credential, inspect Actions logs and safe outputs, rotate credentials, and resume from preview.

## Validation

Before promotion, verify:

- App-only authentication when an App is configured;
- PAT-only authentication when the App is intentionally absent;
- expected precedence when both are configured;
- target repository coverage;
- read operations for repository and workflow discovery;
- a staged safe output without credential material.
