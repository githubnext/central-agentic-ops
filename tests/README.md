# Workflow Configuration Test Matrix

Use this as a lookup from configuration to verified behavior. Examples assume 25 discovered repositories. `-` means unset or not applicable. Statuses are `🟢 Pass` and `🔴 Fail`.

Run dependency-free contract tests with `npm run test:unit`. Run the networked clean-room package and failure-injection tests with `npm run test:integration`; package tests require gh-aw and public GitHub access. Run synthetic enterprise scale tests with `npm run test:load`. `npm test` runs unit and integration tests, while `npm run check` adds load tests and compilation. CI sets `CENTRAL_AGENTIC_OPS_PACKAGE_SOURCE` to the exact commit under test so package installation validates pull-request contents rather than only the default branch.

The automated suite checks source `.md` contracts, ops-value interfaces, smoke-workflow safety, generated workflows, and `gh aw add`/`gh aw update` package behavior. It does not execute agentic workflows or spend AI Credits; the manual `Staged smoke` Actions workflow performs that opt-in runtime check.

## Test Suite

| Layer | Location | Command | Coverage |
| --- | --- | --- | --- |
| Unit | `tests/unit/` | `npm run test:unit` | Policy matrices, workflow contracts, safety limits, generated settings, and package manifest structure. |
| Integration | `tests/integration/` | `npm run test:integration` | Clean-room `gh aw add`/`update` behavior and fail-closed execution of the actual control precompute shell. |
| Load | `tests/load/` | `npm run test:load` | Actual pagination, deterministic batching, and admission logic over 100,000 synthetic repositories, including bounded API failure. |
| Compilation | Source workflows | `npm run compile` | All five agentic workflows compile without emitting repository artifacts. |
| Runtime staged | `.github/workflows/staged-smoke.yml` | Manual Actions dispatch | One bounded target and its workers complete; target refs and issues remain unchanged. |
| Runtime modes | `.github/workflows/enterprise-canary.yml` | Manual protected Actions dispatch | Repository-local staged/review/live routing against dedicated repositories with mode-specific write assertions. |
| Runtime stress | `.github/workflows/enterprise-stress.yml` | Manual protected Actions dispatch | Repository-local two, three, or five same-scope staged runs verify cancellation and no target mutation. |

## Package Lifecycle Integration

The integration suite creates disposable consumer repositories under the system temporary directory and removes them after each test.

| Test result | Command | Checked behavior |
| --- | --- | --- |
| 🟢 Pass | `gh aw add` | Installs the two core orchestrators, three workers, shared imports, packaged skills and agent, and package manifest; excludes optional Pages, repository-only test/smoke assets, and experimental ops values. |
| 🟢 Pass | `gh aw update --force` | Replaces a locally modified package workflow and restores deleted workflow dependencies, skills, and agent files for a branch-tracked package. |

## Enterprise Integration and Load

| Test result | Scenario | Checked behavior |
| --- | --- | --- |
| 🟢 Pass | Invalid scope, mode, correlation, caps, and budgets | The actual control precompute shell rejects 12 malformed or unauthorized inputs before execution. |
| 🟢 Pass | 100,000-repository inventory | Pagination stops at 1,000 pages, retains exactly 100,000 candidates, and applies the 10%/1,000 target cap within 120 seconds. |
| 🟢 Pass | Deterministic cell and batch selection | Stable repository IDs assign every selected candidate to one cell; bounded batches share an inventory version and have distinct batch IDs. |
| 🟢 Pass | Inventory API rate limit | Organization and user lookup each run once, then produce zero candidates, zero target capacity, and a durable error instead of retrying. |
| Manual | Staged canary | Orchestrator and correlated workers complete while target issue/ref snapshots remain identical. |
| Manual, approved | Review canary | Target remains unchanged; optional `require_output` asserts a durable proposal in the private review repository. |
| Manual, approved | Live canary | Optional `require_output` asserts a durable issue, pull request, branch, or comment change in the dedicated target. |
| Manual, approved | Staged stress | Bounded same-scope runs are superseded by concurrency controls and do not mutate the target. |

## Modes

Mode controls how declared [safe outputs](https://github.github.com/gh-aw/reference/glossary/#safe-outputs) are processed: simulated without GitHub API writes in [staged mode](https://github.github.com/gh-aw/reference/glossary/#staged-mode) (`staged`), routed to a review repository (`review`), or processed against their live destination (`live`). All triggers use the same three modes; the trigger determines where the mode is read from.

### Trigger: Schedule (`on.schedule`)

Schedule-triggered runs use the configured bundle mode.

| Test result | Configured mode | Checked scheduled behavior |
| --- | --- | --- |
| 🟢 Pass | `staged` | safe outputs are staged; no GitHub API writes are performed. |
| 🟢 Pass | `review` | safe outputs route to the control-plane repository. |
| 🟢 Pass | `live` | Declared safe outputs may be processed against the live destination. |

### Trigger: Manual ([`workflow_dispatch`](https://github.github.com/gh-aw/reference/glossary/#workflow_dispatch))

Manual-triggered runs use the `safe_output_mode` workflow input. They run independently of the configured scheduled mode and do not change it.

| Test result | `safe_output_mode` workflow input | Checked behavior |
| --- | --- | --- |
| 🟢 Pass | `staged` | Run starts in staged mode; safe outputs perform no GitHub API writes. |
| 🟢 Pass | `review` | Run starts and safe outputs default to the control-plane repository. |
| 🟢 Pass | `live` | Run starts and declared safe outputs may target the live destination. |
| 🟢 Pass | Any recognized mode with scheduled mode disabled | Run starts independently of scheduled configuration. |

## Routing safe outputs for Review

Review routing sends proposed safe outputs to the explicit review destination when provided, otherwise to the current control-plane repository (`github.repository`).

| Test result | Effective mode | `safe_output_repo` workflow input | Checked behavior |
| --- | --- | --- | --- |
| 🟢 Pass | `review` | provided | workflow input repository used. |
| 🟢 Pass | `review` | - | Current control-plane repository used. |
| 🟢 Pass | `staged` | provided | Repository ignored; safe outputs are staged. |
| 🟢 Pass | `live` | provided | Repository ignored; live routing used. |

## Setting Absolute Caps

`max_repos` defaults to `1` and limits selected repositories regardless of mode. The smallest of this cap, the percentage cap, and the dispatch-derived target cap wins.

| Test result | Effective mode | Rollout | `max_repos` | Checked limit |
| --- | --- | --- | --- | --- |
| 🟢 Pass | `staged` | 100% | 1 | 1; safe outputs staged. |
| 🟢 Pass | `staged` | 100% | 10 | 10; safe outputs staged. |
| 🟢 Pass | `review` | 100% | 1 | 1; safe outputs routed for review. |
| 🟢 Pass | `review` | 100% | 10 | 10; safe outputs routed for review. |
| 🟢 Pass | `live` | 100% | 1 | 1. |
| 🟢 Pass | `live` | 100% | 10 | 10. |
| 🟢 Pass | `live` | 10% | 1 | Absolute cap wins: 1. |
| 🟢 Pass | `live` | 10% | 10 | Percentage cap wins: 3. |

## Setting Safe Rollouts

`rollout_percent` gradually expands eligibility. Counts round up so a non-empty inventory can select at least one repository.

| Test result | Effective mode | Rollout | `max_repos` | Checked limit |
| --- | --- | --- | --- | --- |
| 🟢 Pass | `staged` | 10% | - | 3; safe outputs staged. |
| 🟢 Pass | `review` | 10% | - | 3; safe outputs routed for review. |
| 🟢 Pass | `live` | 10% | - | 3. |
| 🟢 Pass | Any | 100% | 1000 | 25. |
| 🟢 Pass | Any | 10% | 1000 | 2.5 rounds up to 3. |
| 🟢 Pass | Any | 10% | 1 | Stricter absolute cap gives 1. |
| 🟢 Pass | Any | 10% | 10 | Stricter percentage cap gives 3. |
| 🟢 Pass | Any | Any | Any | Empty inventory gives 0. |

## Rejecting Unsafe Configuration

Invalid caps, out-of-scope owners, and incomplete control facts stop before worker workflow dispatch.

| Test result | Configured value | Checked behavior |
| --- | --- | --- |
| 🟢 Pass | `rollout_percent: 0` | Rejected. |
| 🟢 Pass | `rollout_percent: 101` | Rejected. |
| 🟢 Pass | Fractional percentage | Rejected. |
| 🟢 Pass | Non-numeric percentage | Rejected. |
| 🟢 Pass | `max_repos` below `1`, fractional, or above `1000` | Rejected. |
| 🟢 Pass | `max_scan_repos` below `1` or above `100000` | Rejected. |
| 🟢 Pass | Invalid cell count/index or batch size/index | Rejected. |
| 🟢 Pass | Target or review repository outside `CENTRAL_AGENTIC_OPS_ALLOWED_OWNERS` | Rejected. |
| 🟢 Pass | Unknown scheduled mode | Scheduled bundle disabled. |
| 🟢 Pass | Legacy `preview` mode | Normalized to staged mode; safe outputs perform no GitHub API writes. |

## Enterprise Safety

| Test result | Scenario | Checked behavior |
| --- | --- | --- |
| 🟢 Pass | Missing settings | staged mode, one target, 1000-repository scan ceiling, control-owner allowlist. |
| 🟢 Pass | Inventory up to 1,000,000 repositories | Selection remains within absolute, percentage, and dispatch caps. |
| 🟢 Pass | Optimization with two eligible workers | 20-dispatch budget permits at most 10 targets. |
| 🟢 Pass | All workers disabled | Effective target cap is zero; no dispatch. |
| 🟢 Pass | Duplicate workflow display names | Workers resolve only by exact generated path; analytics group by workflow path. |
| 🟢 Pass | Enterprise and organization planes target the same repository | Independent provenance, policy, credentials, and kill switches are preserved. |
| 🟢 Pass | Direct worker dispatch | Target and safe-output owners still pass the trusted allowlist. |
| 🟢 Pass | Worker ceiling omitted | Worker remains enabled but staged-only. |
| 🟢 Pass | Review destination is public or inaccessible | Rejected before agent execution. |
| 🟢 Pass | Aggregate AI Credit request exceeds `1100` default | Repository selection is reduced to fit the shared cap. |
| 🟢 Pass | Public targets without an App or PAT | Built-in `GITHUB_TOKEN` supports bounded staged scans; private access, alternate review repositories, and live target writes remain prohibited. |
| 🟢 Pass | Runaway prevention | Every workflow has finite AI credits and timeout; overlapping same-scope runs cancel. |
| 🟢 Pass | API rate limit or budget exhaustion | No internal retry/wait loop or self-dispatch; unresolved work is incomplete and requires a new bounded run. |
| 🟢 Pass | Same-scope queue pressure | Newest run supersedes older running or pending work; no unbounded Actions backlog. |
| 🟢 Pass | Full emergency stop | Documentation requires disabling Actions and canceling all queued/running work in every participating control repository. |

## Compiling Workflow Settings

Compilation checks prove the source policy reaches the generated GitHub Actions workflows.

| Test result | Workflow surface | Checked behavior |
| --- | --- | --- |
| 🟢 Pass | Dependabot orchestrator workflow | Mode, rollout percentage, and `workflow_dispatch` inputs compile. |
| 🟢 Pass | Optimization orchestrator workflow | Mode, rollout percentage, and `workflow_dispatch` inputs compile. |
| 🟢 Pass | Release Train Updater | Standard dispatch envelope and safe output settings compile. |
| 🟢 Pass | AI Credit Auditor | Standard dispatch envelope and safe output settings compile. |
| 🟢 Pass | AI Credit Optimizer | Standard dispatch envelope and safe output settings compile. |
| 🟢 Pass | All worker workflow safe outputs | staged mode and review/live routing vocabulary checked. |
| 🟢 Pass | All five generated workflows | Emitted GitHub Actions settings checked in a clean-room compile. |
| 🟢 Pass | Core catalog package | Installs no Pages workflow, renderer, or Pages permission surface. |
| 🟢 Pass | Experimental ops values | Remain catalog-local under `.github/ops-values/` and are excluded from package manifests. |
| 🟢 Pass | Pages add-on | Explicit nested package contains only the conventional publisher and report skill. |

Exhaustive coverage: 18 scheduled plus 108 manual cases, for 126 unique policy configurations.