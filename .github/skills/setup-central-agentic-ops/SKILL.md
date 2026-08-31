---
name: setup-central-agentic-ops
description: "Set up a Central Agentic Ops (CAO) control plane from scratch. Use when a user asks to create, bootstrap, initialize, install, or get started with CAO; creates or reuses a control repository, installs the root CAO package with gh aw add, writes .github/central-agentic-ops.json, and proves the boundary with one user-selected review target."
argument-hint: "Provide the control repository, visibility, and optional first target repository"
---

# Set Up Central Agentic Ops

Create a new Central Agentic Ops control plane and prove it safely with one reviewed run against a repository the user chooses. Carry the setup through that run unless the user asks to stop earlier.

## Safety Invariants

- Treat this repository as the public package catalog and documentation source. Never configure it as the user's control plane.
- Public and private control repositories are supported. Preserve an existing repository's visibility; for a new repository, use the visibility the user chooses.
- In a public control repository, policy, workflow runs, operational metadata, and review safe outputs are public. State that exposure before creation and never place confidential target information in those outputs.
- Install the root CAO package from one full commit SHA. Resolve a reviewed release or the current default branch once before installation so every package dependency uses the same immutable source identity.
- Keep rollout policy only in `.github/central-agentic-ops.json`. Do not create `CENTRAL_AGENTIC_OPS_*` variables or another policy channel.
- Keep credentials out of files, chat, command arguments, and workflow inputs. Have the user enter secrets directly through GitHub or an interactive terminal prompt.
- Ask the user which repository the first run should target. Offer the control repository as the safe default, but accept another existing `owner/repository` after validating its visibility, access, output exposure, and authentication profile.
- Keep the first run at `max_repos=1`, `rollout_percent=100`, and `safe_output_mode=review`. Keep review outputs in the control repository and never offer `live` during setup.
- Do not report success until the run and its review-routing boundary have been verified.

## Authentication Boundary

Choose authentication after the user chooses the first target. Control-repository visibility does not determine target access.

- use `GITHUB_TOKEN` for control-repository self-review or an exact public target in `review` when outputs remain in the control repository, and report inaccessible cross-repository evidence as incomplete;
- require a least-privilege GitHub App before running against a private or internal target; and
- offer a fine-grained PAT only when an App cannot be obtained, the PAT can reach the exact repositories and APIs, and the user explicitly consents after hearing that it is user-bound, longer-lived, and manually rotated. A PAT cannot grant access the user does not already have. Never use a classic PAT.

Do not place private target evidence in a public control repository. If the selected target or required evidence is non-public, require a private control repository before configuring credentials or running the operation.

## Procedure

1. Load `docs/getting-started.md`, `docs/configuration.md`, and `docs/authentication.md`. Treat them as authoritative for current CAO policy fields and credential selection. The gh-aw workflow-authoring guide applies when creating custom workflows, not when installing this existing package.
2. Determine the GitHub organization and control repository name. If the repository exists, detect and preserve its visibility. If it does not exist, ask whether to create it as `public` or `private`; do not assume either.
3. Ask which repository the first review run should target unless the user already supplied one. Offer `<organization>/<control-repository>` as the default and accept an alternate exact `owner/repository`; do not ask the user to choose an operation package. For an alternate target:
  - verify that it exists, record its visibility and owner, and confirm the authenticated user can access it;
  - explain that review outputs, run metadata, and target identifiers will be stored with the control repository's visibility;
  - require a private control repository when the target or required evidence is non-public; and
  - select and validate the authentication profile from `docs/authentication.md` before installation or execution. Configure an App or consented PAT only when the selected target requires it.
4. Confirm prerequisites without changing repositories:
   - Run `gh auth status` and ensure the authenticated account can create repositories and workflows in the organization.
   - Run `gh aw version`. Compare it with `min-version` in the root CAO `aw.yml`; upgrade `github/gh-aw` only when the installed version is older. Do not require the catalog maintainer's current local version when the package supports an older release.
  - Run `gh aw doctor --repo <organization>/<control-repository> --dir .` only from an attached checkout of an existing repository. Run `gh aw --help` before creating a repository or clone. If the extension is unavailable, install `github/gh-aw`, then rerun the check.
   - Check whether the proposed control repository already exists. Reuse it only with the user's agreement; record its visibility and never delete, overwrite, empty, or change its visibility implicitly.
5. Create and clone the control repository with the chosen `--public` or `--private` visibility when it does not exist. Perform every remaining file and Git operation inside that clone, not inside this catalog checkout. Confirm the active Git remote is the intended control repository, then run `gh aw doctor --repo <organization>/<control-repository> --dir .` before installing CAO.
6. Install the root CAO package. `gh aw add` reads root `aw.yml`, installs its orchestrators, workers, shared controls, skills, and resources, and compiles the workflow lock files:

    ```bash
    cao_ref=$(gh api repos/githubnext/central-agentic-ops/commits/main --jq '.sha')
    [[ "$cao_ref" =~ ^[0-9a-fA-F]{40,64}$ ]]
    gh aw add "githubnext/central-agentic-ops@${cao_ref}"
    ```

    A reviewed release tag may replace `main` when resolving `cao_ref`. Do not pass an unresolved branch or omit the ref: one immutable source identity keeps repeated package dependencies consistent and records a reproducible installation. Do not use `add-wizard`: root `aw.yml` has no bootstrap `config`, and authentication depends on later target scope. Do not author replacement workflows or run `gh aw compile` after installation unless a Markdown workflow was subsequently edited. Never edit generated `.lock.yml` files directly.
7. Create `.github/central-agentic-ops.json`. The package cannot install this file because it is consumer-owned rollout policy. Start with the exact selected target and enable only the Dependabot worker:

   ```json
   {
     "version": 1,
     "control-plane": {
       "scope": {
         "allowed-owners": ["<target-owner>"],
         "allowed-repositories": ["<target-owner>/<target-repository>"]
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

    Keep the omitted defaults: `review`, one repository, and 100 percent rollout. Do not add broader owners or repositories during initial setup.
8. Review the installed and authored files and commit `.github` atomically so `github.workflow_sha` identifies one workflow-and-policy revision. Push the control repository's default branch. Do not include credentials or unrelated files in the commit.
9. Run the installed Dependabot orchestrator in review mode against the selected target, with review outputs remaining in the control repository:

    ```bash
    gh aw run dependabot --ref <default-branch> \
       --raw-field target_repo="<target-owner>/<target-repository>" \
       --raw-field max_repos="1" \
       --raw-field rollout_percent="100" \
       --raw-field safe_output_mode="review"
    ```

10. Watch the orchestrator to completion and inspect its correlated worker run. Verify that exactly the selected target was selected, no more than one updater was dispatched, the effective mode was `review`, and every write was a declared review safe output in the control repository rather than a live target effect. A no-op or incomplete worker result is successful when these boundaries hold and its inaccessible evidence is identified.
11. Report the control repository and visibility, selected target and visibility, authentication profile, installed CAO source reference, policy path, run URLs, and verification result. Treat broader enrollment or `live` promotion as separate follow-up work.

## Stop Conditions

Stop before installation or execution and explain the blocker when:

- the authenticated account lacks required organization or workflow access;
- the selected target does not exist, cannot be accessed, requires credentials that were not configured, or would expose non-public evidence through a public control repository;
- the existing repository contains conflicting files that the user has not approved replacing;
- root package installation fails; or
- generated workflows or policy validation fail.

Preserve completed work when stopping. Never weaken visibility expectations, permissions, policy, or review-mode constraints to force setup through.