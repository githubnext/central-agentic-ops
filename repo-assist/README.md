# Repo Assist Package

> [!NOTE]
> **Research prototype:** Features and interfaces may change as the project evolves.

Repo Assist adapts the repository-local [Repo Assist workflow](https://github.com/githubnext/agentics/blob/main/docs/repo-assist.md) into a Central Agentic Ops package for explicitly enrolled repositories. The orchestrator ranks repositories from bounded backlog signals and dispatches four independently governed workers.

Workflow definitions and credentials remain in the private control repository. Targets receive only declared safe outputs, and live writes additionally require target-owned authority.

## Package Contents

| Workflow | Role |
| --- | --- |
| [`repo-assist`](../.github/workflows/repo-assist.md) | Twice-daily orchestrator that ranks authorized repositories and dispatches applicable workers. |
| [`repo-assist-contributor-care`](../.github/workflows/repo-assist-contributor-care.md) | Labels and investigates issues, supports contributors, and handles bounded stale pull request follow-up. |
| [`repo-assist-improvements`](../.github/workflows/repo-assist-improvements.md) | Creates one validated draft pull request or one actionable improvement issue. |
| [`repo-assist-pr-care`](../.github/workflows/repo-assist-pr-care.md) | Repairs one workflow-owned pull request without merging it. |
| [`repo-assist-activity`](../.github/workflows/repo-assist-activity.md) | Maintains one rolling monthly activity issue from durable outcomes. |

## Install

Install this focused experimental package into a private control repository:

```bash
gh aw add githubnext/gh-aw-cao/repo-assist@<catalog-release>
```

Configure the `repo-assist` package and all four workers in `.github/workflows/cao.json`. Begin with one repository in `review` mode. Review outputs stay in the control repository, while target-bound code changes use artifact-backed review bundles.

The package deliberately omits the repository-local `/repo-assist` free-form command. Enterprise operation uses named workers, bounded dispatch envelopes, checked-in rollout policy, and explicit target authority instead.

## Rollout

The catalog's source-managed control policy enables one review target and caps every worker at `review`. Do not remove those ceilings until early runs have been evaluated and each live target declares `repo-assist` authority for the intended control repository on its protected default branch.

Cross-organization reach is not inferred from enterprise membership. Each owner and repository must be in control-plane scope, the configured credential must reach it, and target-owned authority must allow live operation.

## Safety Boundaries

- The orchestrator selects repositories but performs no target work.
- Every worker re-resolves policy for exactly one dispatched target and cannot dispatch more work.
- GitHub reads remain read-only; mutations use declared safe outputs.
- Contributor-facing actions are bounded and suppress duplicates.
- Improvement pull requests are draft, file-constrained, protected-file aware, and never merged automatically.
- Review mode never sends target item identifiers to outputs scoped to the review repository.
- Missing policy, evidence, access, authority, or validation fails closed.

## Operational Value

The package is new and has no adoption evidence. Per-worker operational-value evaluators remain a post-adoption follow-up:

- Contributor Care: retained, uncorrected helpful-action rate after maturation.
- Improvements: merged, validated pull requests without a linked revert.
- PR Care: assigned pull requests restored to a green, mergeable state.
- Activity: eligible durable outcomes represented by the report cutoff.

Each candidate starts as attainment-only. No baseline, observation, or score is fabricated by this package.

## More Information

- [Configuration reference](../docs/configuration.md)
- [Rollout and safe output routing](../docs/rollout-and-routing.md)
- [Deployment and governance](../docs/deployment-and-governance.md)
- [Operations and incident response](../docs/operations.md)
