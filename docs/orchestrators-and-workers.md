---
title: Orchestrators and Workers
description: Design and govern bundle orchestrators and their bounded worker workflows.
---

Use this page when reviewing a bundle or deciding where new behavior belongs. Orchestrators select and dispatch work; workers perform one bounded repository task and can only narrow the policy they receive.

## Orchestrator Authority

The bundle orchestrator is the policy authority for a run. It:

- imports the bundle's configured mode and review repository;
- discovers and ranks candidate repositories;
- enforces `max_repos` and its declared dispatch maximum;
- resolves configured worker availability;
- computes the effective safe-output destination;
- dispatches workers with the standard control envelope;
- summarizes selections, skips, and dispatches.

An orchestrator does not mutate target repositories directly. Its only write-capable safe output is dispatching its declared workers.

## Worker Enforcement

A worker receives one target and performs one bounded mission. It must:

- treat control precomputation as authoritative;
- analyze only `target_repo`;
- honor `safe_output_mode`, `safe_output_repo`, and `preview_only`;
- use only declared permissions, network access, tools, and safe outputs;
- include correlation metadata in user-visible outputs when provided;
- avoid organization-wide discovery and downstream workflow dispatch;
- fail closed when routing or required evidence is incomplete.

The worker may apply stricter behavior than requested, such as returning no output when evidence is insufficient. It may never promote itself from staged to review or live.

## Worker Value

Operational value is measured per worker, not per orchestrator or bundle. Dispatch counts, generated outputs, and model assessments do not prove that a worker attained its intended repository outcome.

The catalog repository keeps frozen contracts under `.github/ops-values/<worker-stem>.sh`. Package manifests remain workflow-only while value evaluation is experimental, so neither these contracts nor the `aw-value` authoring and report-generation skill are installed into consumer repositories.

A frozen function exposes its contract with `--definition`, scores evidence with `--metric`, and collects batched evidence with `--collect-batch`. Authoring new functions and generating reports remain catalog-maintenance tasks until the skill is ready to ship.

Apply the process independently to every worker in a bundle. Workers may receive different classifications because their outcomes and available history differ:

- `baseline-comparable` applies the same outcome measure before and after adoption;
- `attainment-only` measures post-adoption attainment when comparable history cannot be reconstructed;
- `not measurable` records that no deterministic opportunity, outcome, or accepted-evidence rule can currently be defined.

Do not create placeholder functions or reports while a new worker is unadopted. A frozen function requires its real adoption commit, and evaluation requires matured outcome evidence. The bundle creation skill records this as a post-adoption follow-up for each new worker.

## Current Worker Eligibility

Shared precomputation reads each orchestrator's `safe-outputs.dispatch-workflow.workflows` list and matches it against workflows installed in the control-plane repository. A worker is eligible only when it exists and is not disabled. Missing and disabled workers are skipped with explicit reasons.

This provides an immediate worker kill switch: disable the generated worker workflow in GitHub Actions. Bundle mode and review routing remain bundle-level controls.

## Worker Ceilings

Add worker-specific configuration only when a worker has a materially different blast radius, permission set, maturity timeline, or operational owner. The controls are:

| Control | Purpose | Default |
| --- | --- | --- |
| `enabled` | Explicitly includes or excludes a worker workflow from dispatch | `true` for installed worker workflows |
| `max_mode` | Caps the most permissive mode a worker workflow can execute | `staged` |
| worker workflow limit | Caps worker workflow-specific volume or resource use | Existing Agentic Workflow limit |

Mode ordering is:

`staged < review < live`

The effective worker mode is the less permissive of the requested bundle mode and the worker ceiling:

`effective_mode = min(bundle_mode, worker_max_mode)`

A manual dispatch may narrow the mode but must not exceed the worker ceiling. Review safe outputs use the manual `safe_output_repo` override when provided and otherwise use the current control-plane repository.

Example: Optimization can be live while `optimization-ai-credit-optimizer` remains capped at review. The auditor can run live under the same orchestrator if its own ceiling permits it.

## When to Split Control

Keep control at the bundle level when workers share ownership, permissions, output destination, and promotion evidence. Add a worker ceiling when any of these differ significantly:

- the worker can modify source or workflow files while peers only create issues;
- the worker has broader network or repository permissions;
- the worker is newly introduced and lacks live evidence;
- the worker has a history of noisy or high-volume outputs;
- a separate team approves its production use.

Create a separate bundle, rather than many worker flags, when workers need different authentication, review repositories, schedules, target populations, or operational ownership.

Workers independently reject disabled runs, malformed control envelopes, and modes above their configured ceiling before agent execution. Promote a worker by changing its `MAX_MODE` variable only after its bundle has passed the corresponding rollout gate.
