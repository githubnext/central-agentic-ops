# Central Agentic Ops Activity

The activity package maintains the shared, bounded snapshot used by the Central Agentic Ops dashboard. It indexes deployed GitHub Agentic Workflows and recent runs, collects AI Credit and operational-value observations, and normalizes durable records. It is deterministic GitHub Actions infrastructure: it has no agent, rollout mode, safe output, or target-writing authority.

The root Central Agentic Ops package installs the activity action workflow and indexer. A focused installation is also available from `githubnext/gh-aw-cao/activity@<catalog-release>`.

## Cache contract

The action restores and saves this directory:

```text
$RUNNER_TEMP/cao-activity/
├── aic-usage.json
├── control-plane-inventory.json
├── control-settings.json
├── dashboard-records.json
├── deployed-workflows.json
└── operational-values.json
```

Snapshots use the immutable key `${runner.os}-cao-activity-v2-${github.repository}-${github.run_id}-${github.run_attempt}` and the restore prefix `${runner.os}-cao-activity-v2-${github.repository}-`. Dispatching consumers wait for the exact activity run and reconstruct its immutable key from the returned run ID and attempt. Cache scope and eviction follow [GitHub Actions cache restrictions](https://docs.github.com/actions/using-workflows/caching-dependencies-to-speed-up-workflows#restrictions-for-accessing-a-cache). The cache is an optimization, not durable historical authority.

Consumers should restore the prefix before downloading workflow-run history or collecting dashboard data. If the cache is absent, stale for the consumer's evidence window, incomplete, or outside the required repository scope, they must fetch the missing evidence. The scheduled and manually dispatchable `.github/workflows/activity.yml` workflow is the only cache publisher. When dashboard report resources are not installed, a focused activity installation publishes only `deployed-workflows.json`.

## Activity index schema

`deployed-workflows.json` is a UTF-8 JSON object with `schemaVersion: 1`.

| Field | Shape | Meaning |
| --- | --- | --- |
| `generatedAt` | ISO 8601 string | Time the index was refreshed. |
| `organization` | string | Indexed organization login. |
| `repositoryScope` | `organization` or `allowlist` | Discovery boundary used for this entry. |
| `allowedRepositories` | string array | Effective repository allowlist; empty for organization discovery. |
| `includePrivate` | boolean | Whether private repositories were eligible for discovery. |
| `repositoryCount` | integer | Repositories considered by the indexer. |
| `organizationRepositories` | object | Public, private, internal, and total repository counts when available. |
| `discovery` | object | Availability and completeness flags for workflow, manifest, and capability discovery. |
| `runHealth` | object | Run-data availability, completeness, full or incremental refresh mode, refresh start, UTC window start, window hours, and fetched page count. |
| `bundles` | array | Discovered package manifests and their registered workflows. |
| `standaloneWorkflows` | array | Workflows not attributed to a discovered package. |
| `workflows` | array | Normalized deployed workflow records. |

Each `workflows[]` record identifies its `repository`, source `path`, workflow `id`, `name`, `state`, role, workers, compiler metadata, and update state. Its `runHealth` contains conclusion counters, `runIds`, and `runRecords`. Each run record contains:

```json
{
  "repository": "owner/repository",
  "runId": 123,
  "runNumber": 12,
  "runAttempt": 1,
  "event": "workflow_dispatch",
  "conclusion": "success",
  "status": "completed",
  "createdAt": "2026-09-03T00:00:00Z",
  "startedAt": "2026-09-03T00:00:01Z",
  "updatedAt": "2026-09-03T00:01:00Z",
  "displayTitle": "Package · target · review"
}
```

Failed latest runs may additionally include `admissionStatus`, `admissionReason`, `resource`, `resourceResetAt`, and `resourceWaitHours`. Consumers must use the top-level completeness fields instead of inferring completeness from array length.

When a compatible complete cache entry exists, the indexer retains in-window records and overlaps the previous refresh by one hour. Repositories with newly discovered workflows or retained non-terminal runs receive a full-window refresh. A missing, malformed, incompatible, or incomplete entry causes a complete bounded refresh.
