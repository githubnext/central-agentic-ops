# Orchestrators and Workers

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

The worker may apply stricter behavior than requested, such as returning no output when evidence is insufficient. It may never promote itself from preview to review or live.

## Worker Value

Operational value is measured per worker, not per orchestrator or bundle. Dispatch counts, generated outputs, and model assessments do not prove that a worker attained its intended repository outcome.

Packages include frozen contracts under `.github/value-functions/<worker-stem>.sh`. The experimental `aw-value` authoring and report-generation skill is not installed yet. Each bundle manifest includes only its own worker functions, while the root catalog includes every function.

A frozen function exposes its contract with `--definition`, scores evidence with `--metric`, and collects batched evidence with `--collect-batch`. Authoring new functions and generating reports remain catalog-maintenance tasks until the skill is ready to ship.

Apply the process independently to every worker in a bundle. Workers may receive different classifications because their outcomes and available history differ:

- `baseline-comparable` applies the same outcome measure before and after adoption;
- `attainment-only` measures post-adoption attainment when comparable history cannot be reconstructed;
- `not measurable` records that no deterministic opportunity, outcome, or accepted-evidence rule can currently be defined.

Do not create placeholder functions or reports while a new worker is unadopted. A frozen function requires its real adoption commit, and evaluation requires matured outcome evidence. The bundle creation skill records this as a post-adoption follow-up for each new worker.

## Current Worker Eligibility

Shared precomputation reads each orchestrator's `safe-outputs.dispatch-workflow.workflows` list and matches it against workflows installed in the control-plane repository. A worker is eligible only when it exists and is not disabled. Missing and disabled workers are skipped with explicit reasons.

This provides an immediate worker kill switch: disable the generated worker workflow in GitHub Actions. Bundle mode and review routing remain bundle-level controls.

## Planned Worker Ceilings

Add worker-specific configuration only when a worker has a materially different blast radius, permission set, maturity timeline, or operational owner. The planned controls are:

| Control | Purpose | Default |
| --- | --- | --- |
| `enabled` | Explicitly includes or excludes a worker from dispatch | `true` for installed workers |
| `max_mode` | Caps the most permissive mode a worker can execute | Inherit bundle mode initially; use `preview` for new high-risk workers |
| Worker limit | Caps worker-specific volume or resource use | Existing workflow limit |

Mode ordering is:

`preview < review < live`

The effective worker mode is the less permissive of the requested bundle mode and the worker ceiling:

`effective_mode = min(bundle_mode, worker_max_mode)`

A manual dispatch may narrow the mode but must not exceed the worker ceiling. A worker ceiling does not get a separate review repository by default; it uses the bundle review destination. Add a separate destination only for a documented compliance or ownership boundary.

Example: Optimization can be live while `optimization-ai-credit-optimizer` remains capped at review. The auditor can run live under the same orchestrator if its own ceiling permits it.

## When to Split Control

Keep control at the bundle level when workers share ownership, permissions, output destination, and promotion evidence. Add a worker ceiling when any of these differ significantly:

- the worker can modify source or workflow files while peers only create issues;
- the worker has broader network or repository permissions;
- the worker is newly introduced and lacks live evidence;
- the worker has a history of noisy or high-volume outputs;
- a separate team approves its production use.

Create a separate bundle, rather than many worker flags, when workers need different authentication, review repositories, schedules, target populations, or operational ownership.

## Implementation Requirements for Worker Ceilings

Before worker ceilings are considered active:

1. Add installer variables for the affected worker controls.
2. Pass worker policy into shared precomputation.
3. Compute and persist `effective_mode` before target selection and dispatch.
4. Exclude disabled workers before dispatch.
5. Pass only the effective mode to workers.
6. Make workers independently reject an input above their configured ceiling where technically possible.
7. Add compile validation and preview/review/live behavior tests.
8. Update this document from planned to implemented.
