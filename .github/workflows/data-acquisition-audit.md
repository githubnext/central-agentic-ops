---
name: Data Acquisition Audit Refresher
description: Re-audits gh-aw logs, GitHub API access, downloads, indexing, and caching each day.
intent: Keep the data acquisition audit accurate as repository collection paths and rate-limit risks change.
on:
  schedule: daily
  workflow_dispatch:
  skip-if-match: 'is:pr is:open "gh-aw-workflow-id: data-acquisition-audit" in:body'
permissions:
  contents: read
  pull-requests: read
  copilot-requests: write
concurrency:
  group: "${{ github.workflow }}"
  cancel-in-progress: true
  job-discriminator: "${{ github.run_id }}"
strict: true
max-ai-credits: 300
timeout-minutes: 20
tools:
  bash:
    - "*"
safe-outputs:
  create-pull-request:
    title-prefix: "[data-acquisition-audit] "
    draft: true
    max: 1
    if-no-changes: ignore
    allowed-files:
      - "specs/data-acquisition-audit.md"
  noop:
---

# Data Acquisition Audit Refresher

Re-audit the current repository and update `specs/data-acquisition-audit.md` only when its material findings have changed.

## Investigation

1. Read the existing specification before investigating. Treat it as the report to verify, not as authoritative evidence.
2. Search all production JavaScript, shell, editable workflow Markdown, conventional Actions workflows, graders, setup utilities, and cache consumers for:
   - `gh aw logs` and gh-aw commands that obtain overlapping run history;
   - `gh api`, direct GitHub REST or GraphQL clients, GitHub Script calls, and API polling;
   - artifact or file predownloads;
   - indexes, persisted snapshots, in-memory memoization, browser caches, and Actions caches.
3. Inspect JavaScript and embedded JavaScript, including spawned commands and direct `fetch` or Octokit calls. Do not inspect `.github/agents/`.
4. Treat generated `*.lock.yml` files as manifestations of their editable sources. Do not count repeated generated code as an independent acquisition path.
5. Verify call windows, bounds, pagination, concurrency, retry behavior, cache keys, reuse boundaries, fail-closed behavior, and likely core, search, or GraphQL rate-limit pressure from source evidence.
6. Identify overlapping data collection, cold rescans, N+1 requests, polling, incomplete pagination, isolated caches, and repeated work across workflows.

## Update rules

- Preserve the document's scope, inventory, duplicate-work analysis, prioritized bottlenecks, cache-safety constraints, and staged recommendations.
- Correct stale paths, claims, counts, priorities, or omissions using current repository evidence.
- Set the audit date to the current UTC date when making a material update.
- Keep the report concise and evidence-based. Do not speculate about runtime request counts when source code cannot establish them.
- Do not change runtime code, workflow files, generated locks, policy, documentation outside this specification, or credentials.
- Never print or copy secret values while investigating.

Review the final diff and run `git diff --check`. If the audit remains materially accurate, call `noop` with a short reason and do not create a pull request. Otherwise, call `create_pull_request` exactly once with a concise draft PR describing the changed findings and validation.
