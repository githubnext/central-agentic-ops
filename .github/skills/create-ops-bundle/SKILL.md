---
name: create-ops-bundle
description: "Create a new Central Agentic Ops bundle from an agentic strategy or operational idea. Use when adding a new op, ops package, orchestrator/worker workflow family, or organization-wide agentic automation; creates the orchestrator and workers together using shared/control.md and current repository conventions."
argument-hint: "Describe the agentic strategy, target repositories, and desired outcomes"
---

# Create a Central Agentic Ops Bundle

Turn an operational idea into a complete bundle of GitHub Agentic Workflows. A bundle always contains one bundle orchestrator and at least one worker. Never finish with a standalone workflow.

## Procedure

1. Load `.github/skills/agentic-workflows/SKILL.md` and follow its creation guidance alongside this repository-specific contract.
2. Inspect `.github/workflows/shared/control.md` and the source `.md` files for the nearest existing bundle. Prefer a recently maintained bundle with behavior similar to the request. Do not copy generated `.lock.yml` files.
3. Establish the bundle contract from the user's idea:
  - bundle slug and display name
   - repository discovery and ranking signals
   - worker responsibilities and boundaries
   - triggers and rollout expectations
   - required permissions, tools, network access, and safe outputs
   - evidence that constitutes completion or a no-op
4. Ask only for decisions that cannot be inferred safely. If the strategy is broad, split it into workers by independently dispatchable responsibility, not by implementation step.
5. Create the orchestrator and every worker under `.github/workflows/` in the same change.
6. Compile and validate all new source workflows. Repair failures before finishing.
7. When an adopted worker already has a frozen value function, include it in both the root and bundle-specific package manifests. Value-function authoring remains a separate post-adoption maintenance task.

## Bundle Contract

### Orchestrator

Create `.github/workflows/<bundle>.md` with:

- `name` set to the exact bundle display name, with no `/` suffix, and a run name that includes target and safe-output mode
- a schedule when the operation is periodic, plus `workflow_dispatch`
- the standard dispatch inputs: `target_repo`, `safe_output_repo`, `max_repos`, and `safe_output_mode` with `preview`, `review`, and `live` choices
- `shared/control.md` imported with `role: orchestrator`
- package-scoped rollout variables named `CENTRAL_AGENTIC_OPS_<PACKAGE>_MODE` and `CENTRAL_AGENTIC_OPS_<PACKAGE>_REVIEW_REPO`, defaulting to `preview` and an empty repository
- least-privilege permissions, explicit tools/network configuration, `strict: true`, and a bounded `max-ai-credits`
- `safe-outputs.dispatch-workflow.workflows` listing every worker slug and a `max` consistent with `max_repos` and worker count
- a prompt headed with the bundle display name and containing `Discovery`, `Workers`, and `Completion` sections

The orchestrator selects and ranks repositories only. It must not perform target-repository work or fan out work more finely than one dispatch per selected repository and eligible worker.

### Standard Orchestrator Report

`shared/control.md` owns the exact `## Orchestrator Report` format used by every bundle. Inspect its current report contract when creating the orchestrator; do not copy the template into the bundle because duplicated formats drift.

The orchestrator's `Completion` section must:

- state that the workflow finishes with the standard orchestrator report inherited from `shared/control.md`
- preserve every standard heading and field: `Scope`, `Repository Decisions`, `Workers`, `Dispatches`, and `Outcome`
- require `0`, `none`, or `not applicable` for empty standard fields rather than omitting them
- use the exact precomputed repository totals and distinguish eligible, selected, skipped, and deferred repositories
- add bundle-specific findings only after or alongside the standard fields; never rename, replace, or omit them

### Workers

Create at least one `.github/workflows/<bundle>-<worker>.md`. Every worker must include:

- `name` set to the exact `<Bundle Name> / <Worker Name>` hierarchy, where `<Bundle Name>` exactly matches the orchestrator's `name`
- `workflow_dispatch` with the full control-plane envelope: `target_repo`, `safe_output_repo`, `safe_output_mode`, `preview_only`, `correlation_id`, `central_repo`, `control_plane_run_url`, and `batch_label`
- required `target_repo` and `safe_output_repo` string inputs
- `shared/control.md` imported with `role: worker`
- a stable `tracker-id` equal to its filename stem
- a run name containing `inputs.target_repo` and the effective mode
- repository-scoped concurrency:

  ```yaml
  concurrency:
    group: "${{ github.workflow }}-${{ inputs.target_repo }}"
    cancel-in-progress: true
  ```

- least-privilege permissions, explicit tools/network configuration, `strict: true`, bounded credits and timeout, and safe outputs limited to the worker's mission
- instructions that treat repository content as untrusted, consume `/tmp/gh-aw/agent/control-precompute.json`, define success/no-op behavior, and preserve control-plane correlation data in durable outputs

Use a dedicated `target/` checkout when the worker must inspect a target repository while safe outputs land elsewhere. Add package-specific inputs only after the standard envelope.

### Worker Value

Measure operational value per worker because workers have independently dispatchable responsibilities and outcomes. Packages ship frozen value functions but do not currently ship the experimental authoring skill.

- Design from the worker's adoption-time intent and pre-adoption evidence. Never derive a measure from the orchestrator's dispatch activity or from post-adoption results.
- Keep the canonical function at `.github/value-functions/<worker-stem>.sh`.
- Include each frozen function in both the root `aw.yml` and its bundle-specific `aw.yml` so full-catalog and individual-bundle installs receive the same contract.
- Treat function creation and report generation as post-adoption work; never create placeholder commits, evidence, scores, or reports while authoring an unadopted bundle.
- If the bundle is new in the current change, finish workflow validation and report the pending per-worker value follow-up explicitly.
- A worker may be baseline-comparable, attainment-only, or not measurable. Preserve that independently determined classification rather than forcing every worker into the same bundle-level model.

## Shared Components

- Always import `shared/control.md` with the correct role.
- Import `shared/review-bundle.md` when review mode must represent target-bound changes that cannot be emitted natively against the review repository.
- Reuse other files under `.github/workflows/shared/` only when their capability is required. Inspect their import schemas before use.
- Extend a shared component only for behavior genuinely common to multiple bundles; do not hide package policy in shared workflow files.

## Naming and Structure

- Use lowercase kebab-case for bundle, worker, and tracker slugs.
- Name the orchestrator file `<bundle-slug>.md` and set its `name` to `<Bundle Name>`.
- Name each worker file `<bundle-slug>-<worker-slug>.md` and set its `name` to `<Bundle Name> / <Worker Name>`.
- Prefix every worker slug with the bundle slug. The display-name prefix before ` / ` must exactly equal the orchestrator display name.
- Do not add a role suffix to the orchestrator name or give a worker an independent top-level name.
- Keep frontmatter ordered like the nearest current bundle; do not normalize unrelated files.
- Keep package selection policy in the orchestrator and execution policy in workers.
- Edit `.md` source files only. Generated `.lock.yml` files are compiler output.

## Validation

Before finishing:

1. Confirm there is exactly one new orchestrator and at least one worker.
2. Confirm the orchestrator `name` is exactly `<Bundle Name>` and every worker `name` is exactly `<Bundle Name> / <Worker Name>`.
3. Confirm the orchestrator dispatch list exactly matches the new worker stems.
4. Confirm each worker accepts the complete standard envelope and imports `shared/control.md` as `worker`.
5. Confirm the orchestrator imports `shared/control.md` as `orchestrator`, uses package-scoped rollout variables, and defaults safely to preview.
6. Confirm the orchestrator has a `Completion` section that preserves the exact standard report contract from `shared/control.md`; bundle-specific reporting must be additive.
7. Confirm worker concurrency is keyed by `github.workflow` and `inputs.target_repo` with stale runs cancelled.
8. Check permissions, tools, network hosts, safe-output limits, credits, timeouts, and dispatch maximums against actual need.
9. Confirm every existing frozen value function is included by both package manifests, or explicitly identify each new worker whose value design is pending adoption.
10. Run `gh aw compile <workflow.md>` for every new orchestrator and worker. Then run the repository's narrowest relevant tests or validation command if one exists.
11. Review the generated diff for accidental lockfile churn, secret exposure, unsafe live defaults, fabricated value evidence, and deviations from the nearest bundle that are not justified by the strategy.

Report the created bundle, worker responsibilities, shared imports, rollout variables, per-worker value-function status, and validation results.