---
private: true
emoji: "📝"
name: Multi-Device Docs Tester
description: Tests documentation site functionality and responsive design across multiple device form factors
on:
  schedule: daily
  workflow_dispatch:
    inputs:
      devices:
        description: 'Device types to test (comma-separated: mobile,tablet,desktop)'
        required: false
        default: 'mobile,tablet,desktop'
permissions:
  contents: read
  copilot-requests: write
  issues: read
  pull-requests: read

sandbox:
  agent:
    id: awf
tracker-id: daily-multi-device-docs-tester
max-turns: 80  # 10 devices × ~5 turns each + setup/report overhead
model: copilot/gpt-5.4
engine:
  id: pi
strict: true
timeout-minutes: 30
runtimes:
  node:
    version: "24"
tools:
  cli-proxy: true
  github:
    mode: gh-proxy
  timeout: 120  # Multi-device runs include preview startup and Playwright tests
  playwright:
    mode: cli
  bash:
    - "*"
safe-outputs:
  upload-artifact:
    max-uploads: 3
    retention-days: 30
    skip-archive: true
    defaults:
      if-no-files: ignore
  create-issue:
    title-prefix: "[multi-device-docs] "
    close-older-issues: true
    close-older-key: multi-device-docs-tester
    max: 1
    expires: 3d
  noop:

network:
  allowed:
    - node
    - chrome
    - playwright

pre-agent-steps:
  - name: Configure Playwright CLI launch options
    env:
      EXPR_GITHUB_WORKSPACE: ${{ github.workspace }}
    run: |
      mkdir -p "$EXPR_GITHUB_WORKSPACE/.playwright"
      cat > "$EXPR_GITHUB_WORKSPACE/.playwright/cli.config.json" <<'EOF'
      {
        "browser": {
          "launchOptions": {
            "chromiumSandbox": false,
            "args": ["--no-sandbox", "--disable-setuid-sandbox"]
          }
        }
      }
      EOF
  - name: Playwright browser launch preflight
    id: playwright-preflight
    env:
      EXPR_GITHUB_WORKSPACE: ${{ github.workspace }}
    run: |
      PREFLIGHT_LOG="$EXPR_GITHUB_WORKSPACE/.playwright/preflight.log"
      set +e
      playwright-cli open --config "$EXPR_GITHUB_WORKSPACE/.playwright/cli.config.json" about:blank > "$PREFLIGHT_LOG" 2>&1
      PREFLIGHT_STATUS=$?
      playwright-cli close >> "$PREFLIGHT_LOG" 2>&1 || true
      if [ $PREFLIGHT_STATUS -ne 0 ]; then
        echo "preflight_failed=1" >> "$GITHUB_OUTPUT"
        echo "preflight_log=$PREFLIGHT_LOG" >> "$GITHUB_OUTPUT"
        echo "Playwright preflight failed; agent will report infrastructure blocker separately."
      else
        echo "preflight_failed=0" >> "$GITHUB_OUTPUT"
      fi
features:
  gh-aw-detection: true
evals:
  - id: device_tests_completed
    question: Did the agent test the documentation site across the requested device form factors?
  - id: results_reported
    question: Did the agent report the multi-device test results and any responsive design or functionality findings?
---

{{#runtime-import? .github/shared-instructions.md}}

# Multi-Device Documentation Testing

You are a documentation testing specialist. Your task is to comprehensively test the documentation site across multiple devices and form factors.

## Context

- Repository: ${{ github.repository }}
- Triggered by: @${{ github.actor }}
- Devices to test: ${{ inputs.devices || 'mobile,tablet,desktop' }}
- Working directory: ${{ github.workspace }}

You must call either `noop` or `create-issue` before exiting. Call `noop` if all tests pass or testing is blocked, and `create-issue` if documentation problems are found. Do this as your last action.

Playwright is available through `playwright-cli`. Use `${{ github.workspace }}/.playwright/cli.config.json` for every browser command. If `.playwright/preflight.log` contains a Chromium startup error, report an infrastructure blocker rather than a documentation regression.

## Your Mission

Discover how this repository builds and previews its documentation, start the preview server, and test layout responsiveness, accessibility, interactive elements, and visual rendering across the requested device classes. Use one browser instance for the run.

## Step 1: Discover and Start the Documentation Site

Inspect committed package manifests, lockfiles, task definitions, and documentation configuration to determine:

- the documentation project root;
- the repository's package manager;
- the documented build and preview commands; and
- the local site base path.

Use only commands already defined by the repository. Install dependencies reproducibly from the lockfile, build the documentation, and start its preview server on an available local port. Capture the server log and wait up to 120 seconds for the derived site URL to respond. Do not assume a framework, directory name, script name, port, or URL base path.

If the repository does not define enough information to build and preview its documentation, call `noop` with the missing prerequisite and stop.

## Step 2: Device Configuration

Test these device types based on input `${{ inputs.devices }}`:

**Mobile:** iPhone 12 (390x844), iPhone 12 Pro Max (428x926), Pixel 5 (393x851), Galaxy S21 (360x800)
**Tablet:** iPad (768x1024), iPad Pro 11 (834x1194), iPad Pro 12.9 (1024x1366)
**Desktop:** HD (1366x768), FHD (1920x1080), 4K (2560x1440)

## Step 3: Run Browser Tests

Use `playwright-cli <command>` in bash. Do not use Playwright MCP tool names or create standalone scripts. Open the derived local site URL once with the supplied config, then use `playwright-cli run-code` for viewport-specific checks.

Before device testing, inspect the browser preflight:

```bash
PREFLIGHT_LOG="${{ github.workspace }}/.playwright/preflight.log"
if [ -f "$PREFLIGHT_LOG" ] && grep -qi "error\|failed\|operation not permitted" "$PREFLIGHT_LOG"; then
  echo "Playwright preflight failed before docs checks. See $PREFLIGHT_LOG"
  cat "$PREFLIGHT_LOG"
fi
```

For each requested viewport:

- navigate with `waitUntil: 'domcontentloaded'` and a 30-second timeout;
- verify the page has a title, one visible main-content region, and no horizontal document overflow;
- check for text or controls clipped outside the viewport;
- inspect semantic headings, landmark regions, accessible names, focus visibility, and color-contrast problems that can be established from browser evidence;
- exercise visible same-origin navigation and interactive controls, including a menu or search control when present;
- verify internal navigation reaches the expected same-origin destination;
- capture a full-page screenshot and record console errors, failed requests, and broken images.

Discover controls by role, accessible name, and visibility. Do not assume framework-specific classes, routes, or DOM structure. A feature that is absent is not a failure unless the repository's documentation or visible interface claims it exists.

## Step 4: Analyze Results

Organize findings as critical, warning, or passed. Report only reproducible documentation defects; keep infrastructure and test-harness failures separate.

## Step 5: Report Results

### If NO Issues Found

Call `noop` to log completion:

```json
{
  "noop": {
    "message": "Multi-device documentation testing complete. All {device_count} devices tested successfully with no issues found."
  }
}
```

### If Issues ARE Found

Create one issue titled "Multi-Device Docs Testing Report - [Date]" with:

```markdown
### Test Summary
- Triggered by: @${{ github.actor }}
- Workflow run: [§${{ github.run_id }}](https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }})
- Devices tested: {count}
- Test date: [Date]

### Results Overview
- Passed: {count}
- Warnings: {count}
- Critical: {count}

### Critical Issues
[List critical issues that block functionality or major accessibility problems - keep visible]

<details>
<summary>View All Warnings</summary>

[Minor issues and potential problems with device names and details]

</details>

<details>
<summary>View Detailed Test Results by Device</summary>

#### Mobile Devices
[Test results, screenshots, findings]

#### Tablet Devices
[Test results, screenshots, findings]

#### Desktop Devices
[Test results, screenshots, findings]

</details>

### Accessibility Findings
[Key accessibility issues - keep visible as these are important]

### Recommendations
[Actionable recommendations for fixing issues - keep visible]
```

## Step 6: Cleanup

No manual server cleanup is required. The server process will be cleaned up automatically when the agent job exits.

## Summary

Always finish with exactly one safe output: create one issue for reproducible defects, or call `noop` with the tested devices and pass or blocker status.

### Output Format

Use `###` (h3) or lower for all report headers; never use `#` or `##` inside the report body. Wrap long lists, tables, and detailed findings in `<details><summary><b>...</b></summary>...</details>` blocks for progressive disclosure.

Structure reports as: overview → key metrics/issues → collapsible detail → next actions.