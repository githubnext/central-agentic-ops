# CAO Activity

The activity package maintains a shared, bounded cache of raw `gh aw logs` results. It is deterministic GitHub Actions infrastructure: it has no agent, rollout mode, safe output, data-transformation, or target-writing authority.

The root Central Agentic Ops package installs the scheduled activity workflow, maintenance workflow, and dashboard transformation resources. A focused installation is also available from `githubnext/gh-aw-cao/activity@<catalog-release>`.

## Cache contract

The action restores and saves this directory:

```text
$RUNNER_TEMP/cao-activity/
├── gh-aw-logs.json
└── logs/
    ├── summary.json
    └── run-*/
```

Snapshots use the immutable key `cao-activity-${github.run_id}-${github.run_attempt}` and the restore prefix `cao-activity-`. Consumers restore the latest scheduled snapshot by prefix. Cache scope and eviction follow [GitHub Actions cache restrictions](https://docs.github.com/actions/using-workflows/caching-dependencies-to-speed-up-workflows#restrictions-for-accessing-a-cache). The cache is an optimization, not durable historical authority.

The activity workflow runs `gh aw logs` for the control repository on its schedule and saves the command's JSON result and downloaded usage, agent, detection, and grader artifacts without normalizing or aggregating them.

Consumers should restore the prefix before downloading workflow-run history. If the cache is absent, stale for the consumer's evidence window, incomplete, or outside the required repository scope, they must fail closed or fetch only the missing evidence. The scheduled and manually dispatchable `.github/workflows/activity.yml` workflow is the only cache publisher. Dashboard builds consume the latest cache and perform all report-specific transformation themselves; they never dispatch the activity workflow.

Run the `CAO Maintenance` workflow with the `clear-cache` command to delete CAO-managed cache entries, including entries that use legacy CAO cache keys.
