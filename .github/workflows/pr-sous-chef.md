---
private: true
name: PR Sous Chef
description: Nudges open pull requests toward a focused pr-finisher pass without mutating branches or broadening repository authority.
on:
  schedule: every 30m
  workflow_dispatch:
  slash_command:
    strategy: centralized
    name: souschef
    events: [pull_request_comment]
  skip-if-no-match: "is:pr is:open -is:draft"
permissions:
  actions: read
  contents: read
  issues: read
  pull-requests: read
  copilot-requests: write
strict: true
max-ai-credits: 300
timeout-minutes: 15
concurrency:
  group: "${{ github.workflow }}-${{ github.repository }}"
  cancel-in-progress: true
tools:
  github:
    mode: gh-proxy
    min-integrity: approved
    toolsets: [pull_requests, repos, actions]
  bash: true
safe-outputs:
  add-comment:
    max: 4
    target: "*"
  mentions:
    allowed: ["@copilot"]
  noop:
steps:
  - name: Build bounded pull request queue
    env:
      GH_TOKEN: ${{ github.token }}
      REPOSITORY: ${{ github.repository }}
    run: |
      set -euo pipefail
      mkdir -p /tmp/gh-aw/agent
      gh pr list \
        --repo "$REPOSITORY" \
        --state open \
        --search "is:pr is:open -is:draft sort:updated-asc" \
        --limit 50 \
        --json number,title,url,headRefOid,updatedAt,mergeStateStatus,statusCheckRollup \
        > /tmp/gh-aw/agent/pr-sous-chef-queue.json
---

# PR Sous Chef

Move open pull requests toward a focused maintainer investigation by posting at most four targeted nudges. This workflow is advisory: do not edit files, push branches, update pull requests, approve runs, dismiss reviews, or resolve review threads.

## Required process

1. Read `/tmp/gh-aw/agent/pr-sous-chef-queue.json`.
2. For a `/souschef` invocation, inspect only the pull request that received the command and acknowledge that invocation even when no further nudge is needed.
3. Otherwise, inspect the oldest updated candidates first and select at most four that have an actionable blocker:
   - merge conflicts;
   - completed failed checks;
   - unresolved review feedback;
   - an out-of-date branch when current policy requires it.
4. Skip pull requests with a queued or in-progress check less than one hour old.
5. Skip a pull request when its latest comment contains `<!-- cao-pr-sous-chef-nudge -->`, unless its branch is conflicting.
6. Use bounded, paginated reads. Fetch detailed checks or review threads only for a candidate likely to receive a nudge.
7. Post one combined comment per selected pull request. It must:
   - begin with `<!-- cao-pr-sous-chef-nudge -->`;
   - mention `@copilot`;
   - identify the concrete blocker with links when available;
   - ask Copilot to invoke the repository's `pr-finisher` skill;
   - avoid generic encouragement and duplicate comments.
8. If no candidate needs action, call `noop` with concise counts for evaluated, pending, recently nudged, and ready pull requests.

Never target another repository. Never use raw GitHub writes; all comments must use the `add-comment` safe output.
