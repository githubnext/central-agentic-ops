# Ambient Context Package

> [!NOTE]
> **Research prototype:** Features and interfaces may change as the project evolves.

The Ambient Context package maintains the ambient context that agents read before every task: a repository's `AGENTS.md` and its agent skills. It ships in the core Central Agentic Ops package and can also be installed on its own.

The Agentic Workflow definitions remain in the control repository. Target repositories receive only declared safe outputs; they do not receive installed copies of these workflows.

Ambient context decays quietly. Directories move, commands change, reviewers repeat the same correction, and the always-loaded instruction file keeps growing until it costs more than it helps. This package runs on a weekly-or-slower cadence, finds the repositories whose instructions have drifted the most, and files one issue per repository containing the evidence and a ready-to-run agentic prompt that applies a small, verifiable change.

## Scope Rule

**A repository without a root `AGENTS.md` is out of scope.** The orchestrator skips it and the workers stop before creating anything. This package maintains ambient context that already exists; it never proposes creating it.

## What It Does

- Selects repositories where `AGENTS.md` has drifted from repository reality.
- Verifies the instruction file against the default branch: referenced paths that no longer exist, documented commands that are no longer defined, directories deleted since the file last changed, and build or test tooling that changed afterwards.
- Detects contradictions between instruction files — for example `AGENTS.md` documenting one package manager while `CLAUDE.md` or the committed lockfile says another. A contradiction is worse than an omission, because an agent may follow either branch.
- Flags residue that needs no interpretation: unresolved `TODO`/`FIXME` markers, year references that contradict current reality, and prose version claims that disagree with the manifests.
- Reads merged pull request and review-comment history, weighting corrections repeated on agent-authored pull requests, because a repeated correction is direct evidence of a missing or ignored rule.
- Keeps the file small. Ambient context is loaded into every session, so the package prefers deleting, compressing, and de-duplicating over adding, and targets under 200 lines and under 10 KB.
- Routes content it removes to the cheapest destination that still guarantees it loads when needed: a nested `AGENTS.md` or path-scoped instructions file for directory-specific rules, a skill for procedures, and config or CI for rules a check can enforce deterministically.
- Recommends moving multi-step procedures out of `AGENTS.md` into skills, sharpening skill descriptions so agents can select them correctly, and flagging skills that look abandoned.
- Defers when an open pull request is already modifying an instruction file, so proposals never race an in-flight change.
- Requires an estimated gain of at least 10 percent before it will publish anything. Each worker estimates the tokens its change set removes from the always-loaded context, and emits a `noop` carrying the evidence when the estimate falls short. Correctness findings are not exempt; a sub-threshold defect waits for the next run rather than costing a review now.
- Produces at most one issue per worker run, each containing an agentic prompt with an explicit file allowlist, per-edit evidence, a size budget, and an instruction to skip any edit whose evidence no longer holds.

Both workers are read-only. They never edit a repository, never open a pull request, and never merge anything. A human or a coding agent decides whether to run the prompt.

## Package Contents

| Workflow | Role |
| --- | --- |
| [`ambient-context`](../.github/workflows/ambient-context.md) | Weekly orchestrator workflow that discovers, ranks, and selects repositories with drifting ambient context. |
| [`ambient-context-agents-md-curator`](../.github/workflows/ambient-context-agents-md-curator.md) | Repository-scoped worker workflow that audits `AGENTS.md` and files one issue with an agentic update prompt. |
| [`ambient-context-skills-curator`](../.github/workflows/ambient-context-skills-curator.md) | Repository-scoped worker workflow that audits skills and `AGENTS.md` layering and files one issue with an agentic skills prompt. |

The orchestrator workflow can dispatch no more than 20 worker workflows in one run, shared across both workers.

## Install

The package is part of the core package, so installing Central Agentic Ops installs it:

```bash
gh aw add githubnext/gh-aw-cao@<catalog-release>
```

To install only this package into an existing private control repository:

```bash
gh aw add githubnext/gh-aw-cao/ambient-context@<catalog-release>
```

The package is runnable after its workers are declared in `.github/workflows/cao.json`. `review` is the default mode, so proposals are written to the control repository without changing the target.

## Configure

```json
{
	"version": 1,
	"control-plane": {
		"packages": {
			"ambient-context": {
				"workers": {
					"agents-md-curator": {
						"workflow": "ambient-context-agents-md-curator"
					},
					"skills-curator": {
						"workflow": "ambient-context-skills-curator"
					}
				}
			}
		}
	}
}
```

Package fields control `enabled`, `mode`, `max-repositories`, `rollout-percent`, and `monthly-ai-credit-budget`. Worker fields control `enabled` and `max-mode`. Shared scope, inventory, and credentials are documented in the [configuration reference](../docs/configuration.md) and [authentication guide](../docs/authentication.md).

## Validate in review mode

1. Open the generated **Ambient Context** workflow in the control repository's **Actions** tab.
2. Select **Run workflow**.
3. Set `target_repo` to one fully qualified `owner/repository` name that has a root `AGENTS.md`.
4. Keep `max_repos` at `1` and `safe_output_mode` at `review`.
5. Inspect repository selection, the dispatched workers, and the review issues and agentic prompts in the control repository before promoting the package.

Repeat with a repository that has no `AGENTS.md` and confirm that it is reported as skipped and that no worker produces an issue.

## Promote the Package

| Mode | Behavior |
| --- | --- |
| `review` | Issues are routed to the control-plane repository; manual runs may override it with `safe_output_repo`. |
| `live` | Issues are created in the selected target repository. |

Promote in order: one-repository review, limited live, then scheduled live.

## Cadence

The orchestrator is scheduled weekly. Ambient context should not be rewritten more often than the repository changes, and a weekly-or-slower pass matched with a per-repository issue that expires after 30 days keeps proposals fresh without creating maintenance noise. Slow the schedule further by lowering the package's checked-in `rollout-percent` or `max-repositories`.

## Operational Value

The `AGENTS.md` curator registers a frozen schema-version 4 operational-value evaluator at [`.github/graders/ambient-context-agents-md-curator-operational-value.sh`](https://github.com/githubnext/gh-aw-cao/blob/main/.github/graders/ambient-context-agents-md-curator-operational-value.sh).

The package exists to make agents cheaper to run for the same delivered outcome, so the evaluator measures exactly that rather than counting issues. A run attains value (`1`) only when its proposal was applied and the target got cheaper without getting worse:

| Observation | Value |
| --- | --- |
| A merged pull request changed the target's root `AGENTS.md`, and afterwards the median successful-run token usage fell by at least 10 percent with no increase in the completed-run failure rate | `1` |
| The change merged but token usage fell by less than 10 percent, or the failure rate rose | `0` |
| No merged `AGENTS.md` change within thirty days — the proposal was filed and ignored | `0` |
| The run correctly found no drift and filed no proposal, or the run logs cannot be compared | `null` |

Token usage per successful run measures cost; the completed-run failure rate holds delivered quality fixed, so a cheaper repository only counts when reliability does not regress. The 10 percent floor is the same minimum gain a worker must estimate before it is allowed to file a proposal, so the evaluator scores the promise the worker actually made rather than any reduction at all. Filing an issue is activity, not value, which is why an ignored proposal scores `0`. A correct no-op is not penalized because the run was never assigned an opportunity.

Observations mature thirty days after the run, matching the proposal issue's expiry, and may be recomputed until then:

```bash
gh aw graders operational-value RUN_ID --evidence-at TIMESTAMP --json
```

Co-occurrence inside the assigned window is the accepted evidence. As with every operational-value grader, it does not establish that the workflow caused the outcome.

The skills curator has no evaluator. It would have to claim the same merged pull requests and the same token evidence as the `AGENTS.md` curator, and overlapping opportunity ownership makes both observations uninterpretable.

## Safety Boundaries

- GitHub tools are read-only; the only mutation is one issue per worker run.
- The orchestrator selects repositories and does not curate anything itself.
- A worker receives one target, cannot discover more repositories, cannot dispatch another workflow, and cannot promote its mode.
- Every proposed edit must cite evidence; unsupported suggestions are dropped.
- Repositories without a root `AGENTS.md` are skipped rather than bootstrapped.
- Repository content is untrusted input, never policy.

## Pause or Stop

Set `control-plane.packages.ambient-context.enabled` to `false`, deploy that reviewed policy revision, and cancel active runs. Re-enable in `review` mode after resolving the incident. For a control-plane-wide stop, follow the [emergency-stop procedure](../docs/operations.md#emergency-stop).

## More Information

- [Configuration reference](../docs/configuration.md)
- [Rollout and safe output routing](../docs/rollout-and-routing.md)
- [Control architecture](../docs/architecture.md)
- [Operations and incident response](../docs/operations.md)
