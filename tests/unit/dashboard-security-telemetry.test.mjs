import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { readRunSecurityTelemetry } from "../../dashboard/report/aic-usage.mjs";

test("dashboard telemetry extracts bounded security aggregates without retaining denial details", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "dashboard-security-"));
  const runDirectory = path.join(root, "run-42");
  await mkdir(path.join(runDirectory, "agent"), { recursive: true });
  await mkdir(path.join(runDirectory, "detection"), { recursive: true });
  try {
    await writeFile(path.join(runDirectory, "run_summary.json"), JSON.stringify({
      firewall_analysis: {
        total_requests: 4,
        allowed_requests: 3,
        blocked_requests: 1,
        requests_by_domain: {
          "api.github.com:443": { allowed: 3, blocked: 0 },
          "blocked.example:443": { allowed: 0, blocked: 1 },
        },
      },
      mcp_tool_usage: {
        summary: [{ tool_name: "get_file", call_count: 5 }],
        integrity: {
          total_filtered: 2,
          filtered_tool_counts: { create_issue: 2 },
          filtered_reason_counts: { integrity: 2 },
        },
        guard_policy_summary: {
          total_blocked: 1,
          repo_scope_blocked: 1,
        },
      },
    }));
    await writeFile(path.join(runDirectory, "agent", "agent-stdio.log"), [
      "[sdk-driver] permission denied by workflow tool permissions: read(/private/path)",
      "[sdk-driver] permission denied by workflow tool permissions: mcp(github.create_issue)",
      "unrelated output that must not be retained",
    ].join("\n"));
    await writeFile(path.join(runDirectory, "detection", "detection_result.json"), JSON.stringify({
      prompt_injection: true,
      secret_leak: false,
      malicious_patch: false,
      reasons: [],
      warnings: [{ field: "patch", code: "ERR_VALIDATION", message: "sensitive diagnostic" }],
    }));

    const telemetry = await readRunSecurityTelemetry(root, 42);
    assert.deepEqual(telemetry.accessControl.fileDenials, { read: 1 });
    assert.deepEqual(telemetry.accessControl.toolDenials, { mcp: 1 });
    assert.equal(telemetry.firewall.analysis.blocked_requests, 1);
    assert.equal(telemetry.integrity.summary.total_filtered, 2);
    assert.equal(telemetry.integrity.totalToolCalls, 5);
    assert.deepEqual(telemetry.threatDetection.verdict, {
      promptInjection: true,
      secretLeak: false,
      maliciousPatch: false,
      warnings: [{ field: "patch", code: "ERR_VALIDATION" }],
    });
    assert.doesNotMatch(JSON.stringify(telemetry), /private\/path|sensitive diagnostic|unrelated output/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
