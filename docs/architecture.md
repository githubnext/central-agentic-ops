# Control Architecture

## Objectives

The control plane is designed to:

- operate enterprise-wide and organization-wide workflows from private central repositories;
- promote bundles independently without coupling their release schedules;
- keep credentials and common policy centralized;
- separate repository selection from repository mutation;
- make every dispatched action attributable to a control-plane run;
- fail closed when routing, credentials, or worker eligibility are incomplete.

## Enterprise Topology

Enterprise deployment uses two independent central runtimes: an enterprise control repository for enterprise-shared AWs and optional organization control repositories for organization-shared AWs. A GitHub enterprise account does not directly own repositories, so the enterprise control repository is hosted in a designated organization and operated for enterprise scope.

### Workflow Sources

| Source | Published by | Execution and reach |
| --- | --- | --- |
| **Enterprise-shared AW** | Enterprise platform, security, or automation governance | Runs in the enterprise central control repository and dispatches per-repository worker workflows against configured targets across organizations. |
| **Organization-shared AW** | Organization platform or repository operations team | Runs in an organization central control repository and dispatches per-repository worker workflows against configured targets in that organization. |
| **Repository-local AW** | Repository maintainers | Runs in its own repository and remains outside this control plane unless explicitly enrolled. |

"Enterprise-shared" and "organization-shared" identify both governance scope and runtime ownership. They do not mean that Agentic Workflow definitions are installed into downstream target repositories. In the CentralRepoOps pattern, Orchestrator and worker workflow definitions stay together in their owning central repository; each worker workflow checks out one target and sends declared cross-repository safe outputs to the configured destination.

### Operating Ownership

| Operating model | Owner | Responsibility |
| --- | --- | --- |
| **Enterprise control** | Enterprise platform or automation team | Operates the enterprise central repository, its cross-organization credentials and target inventory, enterprise bundle rollout, monitoring, and incident response. |
| **Organization control** | Organization platform or repository operations team | Operates an organization central repository, local credentials and targets, organization bundle rollout, monitoring, and incident response. |

The models are complementary rather than alternatives. An organization may receive enterprise-shared work from the enterprise control repository while also running organization-shared work from its own control repository. The two sources keep independent policy, credentials, budgets, kill switches, and provenance even when they target the same repository. Their runs may overlap, so downstream rulesets, protected environments, branch protection, and CODEOWNERS remain the final ownership boundary.

### Downstream Fan-Out and Provenance

Each central control repository fans out enabled bundles to selected targets, subject to repository allowlists and dispatch limits. Orchestrator and worker workflows run from that central repository. Each worker workflow checks out one target repository, inspects only that target, and creates only declared safe outputs in the configured downstream destination. A target repository may therefore receive safe outputs from both enterprise and organization control repositories without storing either source's Agentic Workflow definitions.

The standard `central_repo`, `control_plane_run_url`, and `correlation_id` fields identify the originating central runtime and run. Because `central_repo` differs between enterprise and organization control repositories, downstream safe outputs retain their runtime source. Deployments should also preserve catalog and Agentic Workflow identity in workflow metadata and user-visible safe outputs; a dedicated workflow-source field remains a useful future provenance enhancement.

Cross-organization reach is explicit, allowlisted, and credential-scoped. Fully qualified `target_repo` values can address repositories outside the control repository's owning organization only when the owner appears in `CENTRAL_AGENTIC_OPS_ALLOWED_OWNERS` and the configured GitHub App or PAT can perform the operation. The safe default permits only the control repository's owner. The current bounded discovery path enumerates only that owner; automatic enterprise-wide discovery requires an explicit multi-organization target inventory or a future discovery extension. This discovery limitation does not require copying workflows into organization or target repositories.

Repository-local workflow names cannot shadow central workers. Shared control resolves an orchestrator's declared worker slug only by its exact `.github/workflows/<slug>.lock.yml` path in the owning control repository. Target analytics use `workflow_path`, not display name, as identity so same-named target workflows remain separate. Target workflow definitions and logs are untrusted evidence, never policy. Persistent optimization history branches include `central_repo`, keeping enterprise and organization control-plane state separate when both target the same repository.

## What This Does Not Do

Central Agentic Ops controls the catalog workflows that participate in it. It defines their authentication, rollout, repository selection, dispatch, routing, and safe-output behavior. It is not a general enforcement boundary for all automation in an enterprise.

The control plane does not:

- prevent a repository from defining or running other GitHub Actions or Agentic Workflows;
- prevent an authorized user from manually running workflows outside the control plane;
- guarantee that a catalog worker cannot be directly dispatched by a user who already has sufficient Actions access;
- block another GitHub App, PAT, integration, or administrator from changing a repository;
- replace repository rulesets, branch protection, protected environments, CODEOWNERS, Actions policies, or enterprise audit controls;
- make compliance claims for workflows and repositories that are not enrolled in its operating process.

Enterprises that need the control plane to be the approved operating path must enforce that policy with GitHub-native administration. Typical measures include restricting allowed Actions and reusable workflows, requiring review for `.github/workflows/` changes, protecting deployment environments, limiting who can dispatch workflows, narrowing App and PAT repository access, protecting control-plane configuration, and monitoring enterprise audit events.

These controls are complementary: Central Agentic Ops supplies orchestration and gradual rollout for participating workflows, while GitHub organization and enterprise policy determines who may run or introduce automation outside that path.

## Responsibility Model

| Layer | Owns | Must not own |
| --- | --- | --- |
| Shared control | Authentication, common environment, mode interpretation, review requirements, precomputation, control envelope | Bundle ranking or worker workflow-specific mutation policy |
| orchestrator workflow | Bundle mode, review destination, target selection, ranking, dispatch limits, eligible worker workflow list | Direct target mutation or credential duplication |
| worker workflow | Repository analysis, declared safe outputs, permissions, and execution limits | Repository discovery, downstream dispatch, or mode escalation |

The orchestrator workflow is the rollout authority. worker workflows are enforcement points: they consume the dispatched control envelope and must stay within it.

## Execution Flow

1. A schedule trigger or `workflow_dispatch` starts a bundle orchestrator workflow.
2. The orchestrator workflow imports shared control with its bundle mode and review repository.
3. Shared precomputation resolves enablement, routing, candidate repositories, and worker workflow availability into `/tmp/gh-aw/agent/control-precompute.json`.
4. The orchestrator workflow ranks eligible repositories using bundle-specific discovery rules and applies `max_repos` and dispatch limits.
5. The orchestrator workflow dispatches each eligible worker workflow with the standard control envelope.
6. The worker workflow imports shared control as `role: worker`, analyzes only `target_repo`, and emits only its declared safe outputs.
7. safe outputs are simulated in staged mode, routed to the review repository, or processed against the target repository according to the effective mode.

Pages report routing participates in the control plane. staged mode stages report source data without deployment. Review routes report source data to the private `safe_output_repo` and publishes an access-controlled review Pages site owned by that repository. Live routes durable report source data to its normal destination and publishes the production Pages site. Conventional deterministic workflows perform both deployments and own `pages: write` and `id-token: write`; AI agent jobs do not.

## Standard Control Envelope

Every worker workflow dispatch carries:

| Field | Purpose |
| --- | --- |
| `target_repo` | The only target repository the worker workflow may analyze or update |
| `safe_output_mode` | `staged`, `review`, or `live` |
| `safe_output_repo` | safe output destination; review mode defaults this to the current control-plane repository |
| `preview_only` | Enables staged mode for safe outputs when `true` |
| `correlation_id` | Joins worker workflow safe outputs to the orchestrator workflow run |
| `central_repo` | Identifies the control-plane repository |
| `control_plane_run_url` | Provides the originating run for audit and diagnosis |
| `batch_label` | Optional worker-specific grouping value |

Credentials are not part of this envelope. Each run resolves authentication through shared control.

## Invariants

- staged mode is the default mode.
- Automatic discovery scans at most `1000` repositories by default and never more than `10000`.
- Repository selection defaults to one target and is bounded by absolute, percentage, and dispatch-derived caps.
- Manual targets and review destinations are restricted to trusted repository owners; the default is the control repository owner.
- Review mode defaults to the current control-plane repository when no destination override is provided.
- An orchestrator workflow dispatches only worker workflows declared in its `safe-outputs.dispatch-workflow.workflows` list and resolved by exact generated-workflow path.
- Disabled or unavailable worker workflows are skipped with a reason.
- A worker workflow handles one dispatched target and does not perform organization-wide discovery.
- GitHub tools are read-only; writes occur only through declared safe-output primitives.
- Agents do not receive Pages deployment permission or mode-promotion authority. Pages report mode and destination come from the control envelope; persistent publication is performed only by conventional deterministic workflows from trusted durable inputs.
- Review Pages must be access-controlled for the intended reviewers and isolated from production Pages. If that boundary is unavailable, review publication fails closed.
- A `workflow_dispatch` run may narrow or redirect one run but does not change another bundle's configured mode.
- Control-plane correlation is included in worker workflow-created issue, pull request, or comment safe outputs when available.

## Failure Posture

The system should stop or reduce scope when it cannot establish a required fact:

- inaccessible review destination in review mode: emit `report_incomplete` rather than writing elsewhere;
- unavailable or disabled worker: skip that worker;
- unreadable target or unresolved default branch: skip that target;
- invalid control precomputation: fail the run rather than infer policy;
- out-of-range repository, discovery, rollout, or dispatch caps: fail precomputation rather than widen scope;
- target or review repository outside the trusted owner allowlist: fail before repository access or dispatch;
- safe output not representable safely in review mode: publish an explicit review bundle or emit `report_incomplete`;
- Pages report in review mode without an access-controlled Pages-capable `safe_output_repo`: do not deploy the report;
- missing required authentication: fail before repository mutation.

## Current Controls

Implemented controls include shared authentication, bundle-level modes and review destinations, target and dispatch limits, worker workflow eligibility checks, standard dispatch envelopes, read-only GitHub tools, and worker workflow safe outputs.

Worker-level `enabled` and `max_mode` controls provide ceilings beneath bundle policy for workers with independent risk or maturity. They are not separate control planes. See [Orchestrators and Workers](orchestrators-and-workers.md).
