---
title: Admission Gates
description: Understand what Central Agentic Ops checks before activation and what authorized-run precompute checks before agent execution.
---

Central Agentic Ops admits a run only when its checked-in control policy authorizes the workflow identity and requested limits. Admission happens in the gh-aw pre-activation job, before activation and before any agent executes.

```text
trigger -> pre-activation admission -> authorized-run precompute -> activation -> agent
                 | denied              | blocked
                 +-> skip with reason  +-> no agent execution
```

## What Admission Gates

The shared control component reads `.github/cao/src/control.mjs` and `.github/cao/src/policy.mjs` from the exact `github.workflow_sha`. Admission then reads `.github/workflows/cao.json` at that revision, and authorized runs execute the `precompute` command from the same modules. They do not use policy or CAO runtime from another branch or from the agent checkout.

| Check | Admitted when |
| --- | --- |
| Runtime revision | `github.workflow_sha` is an exact commit and the policy and both CAO modules are readable at that revision. |
| Policy document | The JSON has supported keys, types, ranges, unique names, no duplicate keys, and no GitHub Actions expressions. |
| Control plane | `control-plane` exists. |
| Workflow identity | The workflow declares `orchestrator` or `worker`; workers also declare an exact worker identity. |
| Package | The package is declared and not disabled. |
| Worker | A worker is declared under that package and not disabled. |
| Target input | A supplied `target_repo` uses exact `owner/repository` form. Scope and access are checked later during precompute. |
| Mode input | `safe_output_mode` is `review` or `live` and does not exceed the checked-in package, target, or worker ceiling. |
| Run limits | `max_repos` and `rollout_percent` are valid and do not exceed checked-in policy. |

A manual dispatch can narrow a run, such as changing an authorized `live` run to `review` or reducing `max_repos`. It cannot promote mode, add scope, enable a package or worker, or increase a limit.

## What Precompute Gates

Admission is deliberately lightweight and repository-local. Once admitted, `.github/workflows/shared/control.md` runs deterministic precompute checks that need credentials, repository metadata, inventory, or usage evidence.

| Admission | Authorized-run precompute |
| --- | --- |
| Validates policy and workflow identity | Resolves repository inventory and allowlists |
| Rejects disabled or undeclared packages and workers | Verifies target and review-repository access |
| Prevents manual inputs from widening policy | Verifies target-owned authority for `live` work |
| Computes policy ceilings | Applies repository, rollout, dispatch, and monthly AI Credit limits |
| Uses only the control repository revision | Confirms installed worker workflow availability and binds output routing |

Failure in either phase prevents agent execution. Admission denial skips activation; precompute fails closed when an authorized run cannot establish a required remote fact. Successful precompute uploads only `control-precompute.json`; the agent job restores and validates that non-secret artifact before checkout or model invocation.

## Connect Setup and Policy

Setup creates one atomic control-plane revision:

1. Install the gh-aw package from an immutable CAO tag or commit.
2. Materialize `.github/cao/src/control.mjs` and `.github/cao/src/policy.mjs` from that same CAO revision.
3. Declare the installed package and its worker-to-workflow mapping in `.github/workflows/cao.json`.
4. Commit the workflows, generated locks, CAO runtime, and policy together, then push before running the operation.

The CAO runtime files are control-repository-owned and are not gh-aw package resources. Follow [Quickstart: add the operation](getting-started.md#step-3---add-the-dependabot-operation) to install them and [Quickstart: set the first-run boundary](getting-started.md#step-4---set-the-first-run-boundary) to create the policy.

Package installation does not install the CAO runtime, declare a package, or grant admission. The CAO setup procedure and checked-in control policy own those decisions.

The [Configuration Reference](configuration.md) defines every policy field. The phase that uses each group is:

| Configuration | Admission effect | Precompute effect |
| --- | --- | --- |
| `control-plane.packages` and `workers` | Declares and enables the exact workflow identity. | Resolves installed worker workflow paths. |
| `mode`, target `mode`, and worker `max-mode` | Establishes the maximum mode a dispatch may request. | Requires matching target-owned authority before `live` work. |
| `max-repositories` and `rollout-percent` | Rejects a wider manual request. | Bounds selected repositories. |
| `scope` | Validates and returns the configured owners and repositories. | Filters inventory and rejects out-of-scope targets or review destinations. |
| `inventory` | Validates scan, cell, and batch limits. | Performs bounded discovery and deterministic batching. |
| `monthly-ai-credit-budget` | Validates and returns the package budget. | Reads usage and admits only work that fits the remaining budget. |

## Diagnose a Skipped Run

Open the run summary and find **Central Agentic Ops admission**. An authorized run names its package and role. A denied run records a reason and leaves activation skipped.

| Reason | Configuration or setup to check |
| --- | --- |
| `control-plane-absent` | Add `control-plane` to `.github/workflows/cao.json`. |
| `package-undeclared` | Add the installed package under `control-plane.packages`. |
| `package-disabled` | Review the package, then remove `enabled: false` when it is safe to resume. |
| `worker-disabled` | Review the worker, then remove `enabled: false` when it is safe to resume. |
| `control policy validation failed` | Validate policy keys, values, identities, and requested manual inputs. |
| Cannot read or execute CAO runtime | Materialize both `.github/cao` runtime files from the same immutable package revision and commit them with the workflows. |

Fix the checked-in setup or policy, commit and push the new revision, then start a new run. Do not bypass admission by editing a generated `.lock.yml` file or by widening manual inputs.