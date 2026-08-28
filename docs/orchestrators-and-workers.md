---
title: Orchestrators and Workers
description: Design and govern operation orchestrators and their bounded worker workflows.
---

Use this page when reviewing an operation or deciding where new behavior belongs. Orchestrators select and dispatch work; workers perform one bounded repository task and can only narrow the policy they receive.

```text
orchestrator                              worker
------------                              ------
discover candidates                       receive one target
rank and cap selection   --dispatch-->     validate the control envelope
resolve eligible workers                  analyze only that target
summarize outcomes       <--result----     emit declared safe outputs
```

:::note[The ownership test]
If behavior chooses *which repositories run*, it belongs in the orchestrator. If it decides *what to do in one selected repository*, it belongs in the worker.
:::

## Orchestrator Authority

The operation orchestrator is the policy authority for a run. It:

- imports the operation's configured mode and review repository;
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
- honor `safe_output_mode` and `safe_output_repo`;
- use only declared permissions, network access, tools, and safe outputs;
- include correlation metadata in user-visible outputs when provided;
- avoid organization-wide discovery and downstream workflow dispatch;
- fail closed when routing or required evidence is incomplete.

The worker may apply stricter behavior than requested, such as returning no output when evidence is insufficient. It may never promote itself from review to live.

A worker receives control data shaped like:

```yaml
target_repo: acme/example-service
safe_output_mode: review
safe_output_repo: acme/central-agentic-ops-review
correlation_id: dependabot-2026-08-25-001
central_repo: acme/central-agentic-ops
control_plane_run_url: https://github.com/acme/central-agentic-ops/actions/runs/123456
```

It does not receive a token, discovery query, or permission to dispatch another workflow.

## Worker Value

Operational value is measured per worker, not per orchestrator or operation. Dispatch counts, generated outputs, and model assessments do not prove that a worker attained its intended repository outcome.

Each adopted worker registers a frozen schema-version 4 evaluator under `.github/graders/<worker-stem>-operational-value.sh`. gh-aw executes that evaluator for the workflow run, records its assigned opportunity and evidence provenance, and publishes the result in the unified `agent` artifact's `grader_results.json`.

An evaluator exposes its contract with `--definition`, scores evidence with `--metric`, and observes one run with `--grade-run`. Pages reads these actual workflow artifacts; it does not recollect repository history or render committed synthetic timelines. It retains run observations through their maturity horizon, regrades due runs from a trusted checkout with the frozen evaluator, and aggregates only the latest evaluator digest. Repeated runs assigned to one opportunity are collapsed before aggregation.

```bash
EVALUATOR=".github/graders/<worker-stem>-operational-value.sh"

"$EVALUATOR" --definition
"$EVALUATOR" --metric < evidence.json
gh aw graders operational-value RUN_ID --evidence-at TIMESTAMP --json
```

:::tip[Measure repository outcomes]
Count an outcome only when accepted evidence satisfies the worker's frozen contract. A successful dispatch or generated suggestion is activity, not attained value.
:::

:::caution[Verify package transport]
A packaged worker is grader-enabled only when a clean `gh aw add` consumer receives both its Markdown workflow and referenced `.github/graders/*.sh` evaluator. The gh-aw operational-value merge commit validates and freezes evaluators but its package installer does not yet transport that directory, so publishing these grader-enabled packages remains blocked on installer support. Direct checkouts of this repository compile and run the graders.
:::

Apply the process independently to every worker in an operation. Workers may receive different classifications because their outcomes and available history differ:

- `baseline-comparable` applies the same outcome measure before and after adoption;
- `attainment-only` measures post-adoption attainment when comparable history cannot be reconstructed;
- `not measurable` records that no deterministic opportunity, outcome, or accepted-evidence rule can currently be defined.

Do not create placeholder evaluators while a new worker is unadopted. A frozen evaluator requires its real adoption commit and a stable run-to-opportunity assignment. The operation creation skill records this as a post-adoption follow-up for each new worker.

## Current Worker Eligibility

Shared precomputation reads each orchestrator's `safe-outputs.dispatch-workflow.workflows` list and matches it against workflows installed in the control-plane repository. A worker is eligible only when it exists and is not disabled. Missing and disabled workers are skipped with explicit reasons.

This provides an immediate worker kill switch: disable the generated worker workflow in GitHub Actions. Operation mode and review routing remain operation-level controls.

## Worker Ceilings

Add worker-specific configuration only when a worker has a materially different blast radius, permission set, maturity timeline, or operational owner. The controls are:

| Control | Purpose | Default |
| --- | --- | --- |
| `enabled` | Explicitly includes or excludes a worker workflow from dispatch | `true` for installed worker workflows |
| `max_mode` | Caps the most permissive mode a worker workflow can execute | `review` |
| worker workflow limit | Caps worker workflow-specific volume or resource use | Existing Agentic Workflow limit |

Mode ordering is:

`review < live`

The effective worker mode is the less permissive of the requested operation mode and the worker ceiling:

`effective_mode = min(operation_mode, worker_max_mode)`

For example:

```text
operation mode    = live
worker max_mode   = review
effective mode    = review
```

A manual dispatch may narrow the mode but must not exceed the worker ceiling. Review safe outputs use the manual `safe_output_repo` override when provided and otherwise use the current control-plane repository.

Example: Optimization can be live while `optimization-ai-credit-optimizer` remains capped at review. The auditor can run live under the same orchestrator if its own ceiling permits it.

```bash
gh variable set CENTRAL_AGENTIC_OPS_OPTIMIZATION_OPTIMIZER_MAX_MODE \
	--repo "acme/central-agentic-ops" \
	--body "review"
```

:::caution[Ceilings only narrow]
Raising a worker ceiling does not promote the operation. Lowering it takes effect as an additional guard beneath scheduled and manual mode requests.
:::

## When to Split Control

Keep control at the operation level when workers share ownership, permissions, output destination, and promotion evidence. Add a worker ceiling when any of these differ significantly:

- the worker can modify source or workflow files while peers only create issues;
- the worker has broader network or repository permissions;
- the worker is newly introduced and lacks live evidence;
- the worker has a history of noisy or high-volume outputs;
- a separate team approves its production use.

Create a separate operation, rather than many worker flags, when workers need different authentication, review repositories, schedules, target populations, or operational ownership.

Workers independently reject disabled runs, malformed control envelopes, and modes above their configured ceiling before agent execution. Promote a worker by changing its `MAX_MODE` variable only after its operation has passed the corresponding rollout gate.
