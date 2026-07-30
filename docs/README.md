# Control Plan

Central Agentic Ops gives an enterprise or organization a private central repository from which to authenticate, observe, and govern GitHub Agentic Workflow bundles. The operating path is deliberately short: install, authenticate, preview, review, and promote.

## Choose Your Path

| Goal | Start here |
| --- | --- |
| Install or run the control plane | [Operations](operations.md) |
| Stop all control-plane workflows | [Emergency stop](operations.md#emergency-stop) |
| Find a variable, secret, or run input | [Configuration reference](configuration.md) |
| Configure a GitHub App or PAT | [Authentication](authentication.md) |
| Move a bundle from preview to live | [Rollout and output routing](rollout-and-routing.md) |
| Evaluate security and control boundaries | [Architecture](architecture.md) |
| Plan adoption across multiple organizations | [Enterprise topology](architecture.md#enterprise-topology) |
| Understand scope and enforcement limits | [What this does not do](architecture.md#what-this-does-not-do) |
| Add or govern workers | [Orchestrators and workers](orchestrators-and-workers.md) |

## The Model

1. Shared control owns authentication and common fail-closed policy.
2. A bundle orchestrator owns rollout, target selection, and dispatch.
3. A worker receives one target and can use only its declared safe outputs.
4. Every bundle starts in preview and is promoted independently.

That is the default granularity: control bundles, not every worker. A worker gets an additional ceiling only when its permissions, risk, ownership, or maturity differs materially from its peers.

## Status

Implemented today: shared App-or-PAT authentication, bundle modes and review destinations, target and dispatch limits, worker eligibility checks, read-only GitHub tools, constrained safe outputs, and correlated runs.

Planned, not yet enforced: worker-specific `enabled` and `max_mode` settings. These settings can only reduce the mode authorized by the bundle orchestrator. See [Orchestrators and Workers](orchestrators-and-workers.md).

## Sources of Truth

The executable workflow definitions remain the source of truth when documentation and implementation differ:

- Shared policy: `.github/workflows/shared/control.md`
- Precomputed control facts: `.github/workflows/shared/control-precompute.md`
- Bundle orchestration: `.github/workflows/dependabot.md` and `.github/workflows/optimization.md`
- Package installation configuration: `aw.yml`, `dependabot/aw.yml`, and `optimization/aw.yml`
- Worker permissions and safe outputs: each worker workflow under `.github/workflows/`

Changes to control behavior should update the relevant workflow, this documentation, and validation evidence in the same pull request.
