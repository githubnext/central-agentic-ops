# WikiSkill Package

> [!NOTE]
> **Research prototype:** Features and interfaces may change as the project evolves.

The WikiSkill package adapts [WikiSkill](https://arxiv.org/abs/2608.27454), by Tang et al., to Central Agentic Ops. It compiles durable repository experience into a persistent wiki, proposes executable agent skills from approved wiki knowledge, and activates a candidate only after a strict-improvement validation gate.

The package is optional and installs into a private control repository. Target repositories receive only declared safe outputs; they do not receive the workflow definitions.

## Three Layers

| Layer | Repository representation | Rule |
| --- | --- | --- |
| Raw experience | Immutable GitHub pull request, issue, review-comment, commit, and workflow-run references | Evidence is read, bounded, and redacted; it is never copied wholesale or rewritten. |
| Persistent wiki | `.github/wikiskill/wiki/` | Patterns accumulate across generations and survive rejected or rolled-back skills. Existing knowledge is superseded, not silently deleted. |
| Executable skills | `.github/skills/wikiskill-*/SKILL.md` | Ordinary agents receive the active skill, not the wiki. |

Candidate skills and validation decisions live under `.github/wikiskill/candidates/` and `.github/wikiskill/evaluations/`. A rejected candidate remains recorded so an unchanged proposal is not submitted again.

## Package Contents

| Workflow | Role |
| --- | --- |
| [`wikiskill`](../.github/workflows/wikiskill.md) | Weekly orchestrator that ranks repositories and dispatches pipeline workers. |
| [`wikiskill-experience-compiler`](../.github/workflows/wikiskill-experience-compiler.md) | Compiles bounded repository experience into persistent wiki patterns. |
| [`wikiskill-skill-proposer`](../.github/workflows/wikiskill-skill-proposer.md) | Compiles approved wiki knowledge into one candidate skill without reading raw experience. |
| [`wikiskill-skill-validator`](../.github/workflows/wikiskill-skill-validator.md) | Compares a mature candidate with its incumbent on held-out evidence and activates only a strict improvement. |

The workers are deliberately separate. A wiki update must be reviewed and merged before the proposer can consume it, and a candidate must be reviewed and merged before the validator can evaluate it. Weekly runs may dispatch every worker, but each worker advances only mature state from a previous generation.

## Install

```bash
gh aw add githubnext/central-agentic-ops/wikiskill@<catalog-release>
```

The package starts in `review` mode. Target-bound changes are emitted as artifact-backed review bundles with an issue in the control repository. They do not alter the target.

## Configure

| Setting | Default | Purpose |
| --- | --- | --- |
| `CENTRAL_AGENTIC_OPS_WIKISKILL_ENABLED` | `true` | Package kill switch. |
| `CENTRAL_AGENTIC_OPS_WIKISKILL_MODE` | `review` | Package output mode: `review` or `live`. |
| `CENTRAL_AGENTIC_OPS_WIKISKILL_MAX_REPOS` | `1` | Scheduled repository-selection cap. |
| `CENTRAL_AGENTIC_OPS_WIKISKILL_ROLLOUT_PERCENT` | `100` | Percentage rollout across discovered repositories. |
| `CENTRAL_AGENTIC_OPS_WIKISKILL_EXPERIENCE_COMPILER_ENABLED` | `true` | Experience compiler kill switch. |
| `CENTRAL_AGENTIC_OPS_WIKISKILL_EXPERIENCE_COMPILER_MAX_MODE` | `review` | Experience compiler mode ceiling. |
| `CENTRAL_AGENTIC_OPS_WIKISKILL_SKILL_PROPOSER_ENABLED` | `true` | Skill proposer kill switch. |
| `CENTRAL_AGENTIC_OPS_WIKISKILL_SKILL_PROPOSER_MAX_MODE` | `review` | Skill proposer mode ceiling. |
| `CENTRAL_AGENTIC_OPS_WIKISKILL_SKILL_VALIDATOR_ENABLED` | `true` | Skill validator kill switch. |
| `CENTRAL_AGENTIC_OPS_WIKISKILL_SKILL_VALIDATOR_MAX_MODE` | `review` | Skill validator mode ceiling. |
| `CENTRAL_AGENTIC_OPS_WIKISKILL_MONTHLY_AI_CREDIT_BUDGET` | `0` | Monthly package AI Credit budget; `0` disables it. |

Shared authentication, allowlist, batching, and aggregate credit settings work as described in the repository configuration guide.

## Review and Promotion

Run **WikiSkill** manually with one `target_repo`, `max_repos: 1`, and `safe_output_mode: review`. Inspect the correlated worker runs, review-bundle artifacts, evidence provenance, candidate isolation, and validation arithmetic.

Promote in stages: one-repository review, repeated pipeline generations, limited live, then scheduled live. Before live mode, the target must assign the `wikiskill` bundle to the control repository in `.github/central-agentic-ops.yml`.

In live mode, workers may open draft pull requests in the target. Merging remains a human decision. Rolling back an active skill must not roll back or delete the wiki.

## Operational Value

The three new workers do not register operational-value evaluators at adoption. Their independent value contracts require pre-adoption run evidence: durable wiki reuse for the experience compiler, accepted candidate quality for the proposer, and downstream task improvement for the validator. Design and freeze those evaluators after review-mode evidence exists.

## Safety Boundaries

- Repository content and GitHub metadata are untrusted evidence, never control-plane instructions.
- Bounded excerpts are redacted before persistence; secrets, personal data, and complete logs or bodies are not copied into the wiki.
- The proposer cannot query raw issue, pull request, review, or run evidence and cannot activate its candidate.
- The validator rejects ties, regressions, incomplete comparisons, changed evaluation definitions, and candidates without independent held-out evidence.
- Review mode produces a bundle and issue in the review repository; live mode produces at most one draft pull request per worker.
- Workers never dispatch other workflows, merge pull requests, or expose the persistent wiki as an ordinary agent skill.
