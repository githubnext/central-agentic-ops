import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { actionsLog as log } from "../../activity/actions-log.mjs";
import { parseRolloutMode } from "./dashboard-language-sources.mjs";
import { firstText } from "./text-utils.mjs";

function runGhAw(targets, maxRunsPerWorkflow, outputDirectory) {
  return new Promise((resolve, reject) => {
    const child = spawn("gh", [
      "aw", "logs", "--json",
      "--output", outputDirectory, "--summary-file", "",
      "--artifacts", "usage,agent,detection",
      "--start-date", "-2d", "--cache-before", "-2d",
      "--count", String(maxRunsPerWorkflow), "--timeout", "15",
      "--max-github-api-rate-limit", "-2000", "--max-storage", "1024",
      ...targets,
    ], { env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    const stdout = [];
    const stderr = [];
    let outputBytes = 0;
    child.stdout.on("data", (chunk) => {
      outputBytes += chunk.length;
      if (outputBytes > 50 * 1024 * 1024) child.kill();
      else stdout.push(chunk);
    });
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code, signal) => {
      const diagnostic = Buffer.concat(stderr).toString("utf8").trim();
      if (code === 0 && !signal) resolve(Buffer.concat(stdout).toString("utf8"));
      else reject(new Error(diagnostic || `gh aw logs exited with ${signal || code}`));
    });
  });
}

const MAX_SECURITY_FILE_BYTES = 10 * 1024 * 1024;
const MAX_SECURITY_FILES = 2_000;

async function securityFiles(root) {
  const files = [];
  const pending = [root];
  while (pending.length > 0 && files.length < MAX_SECURITY_FILES) {
    const current = pending.pop();
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const candidate = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(candidate);
      else if (entry.isFile()) files.push(candidate);
      if (files.length >= MAX_SECURITY_FILES) break;
    }
  }
  return files;
}

async function readBounded(file) {
  try {
    const details = await stat(file);
    if (!details.isFile() || details.size > MAX_SECURITY_FILE_BYTES) return null;
    return await readFile(file, "utf8");
  } catch {
    return null;
  }
}

function emptySecurityTelemetry() {
  return {
    accessControl: { available: false, fileDenials: {}, toolDenials: {}, guardPolicy: null },
    firewall: { available: false, analysis: null },
    integrity: { available: false, summary: null, totalToolCalls: 0 },
    mcp: { available: false, cliVersion: null, servers: [], calls: [], failures: [] },
    threatDetection: { available: false, verdict: null },
  };
}

function countPermissionDenials(content, telemetry) {
  const pattern = /\[sdk-driver\].*permission denied by workflow tool permissions:\s*(read|write|shell|mcp|url|custom-tool)\(/gi;
  for (const match of content.matchAll(pattern)) {
    const kind = match[1].toLowerCase();
    const target = kind === "read" || kind === "write"
      ? telemetry.accessControl.fileDenials
      : telemetry.accessControl.toolDenials;
    target[kind] = (target[kind] || 0) + 1;
  }
}

function validThreatVerdict(value) {
  return value
    && typeof value === "object"
    && typeof value.prompt_injection === "boolean"
    && typeof value.secret_leak === "boolean"
    && typeof value.malicious_patch === "boolean"
    && Array.isArray(value.reasons);
}

export async function readRunSecurityTelemetry(outputDirectory, runId) {
  const telemetry = emptySecurityTelemetry();
  const files = await securityFiles(path.join(outputDirectory, `run-${runId}`));
  const summaryFile = files.find((file) => path.basename(file) === "run_summary.json");
  if (summaryFile) {
    const content = await readBounded(summaryFile);
    if (content !== null) try {
      const summary = JSON.parse(content);
      telemetry.mcp.cliVersion = firstText(summary.cli_version);
      const firewall = summary.firewall_analysis;
      if (firewall && typeof firewall === "object") {
        telemetry.firewall = { available: true, analysis: firewall };
      }
      const toolUsage = summary.mcp_tool_usage;
      if (toolUsage && typeof toolUsage === "object") {
        telemetry.mcp.available = true;
        telemetry.mcp.servers = Array.isArray(toolUsage.servers)
          ? toolUsage.servers.map((server) => ({
            serverName: firstText(server?.server_name),
            serverVersion: firstText(server?.server_version, server?.version),
            protocolVersion: firstText(server?.protocol_version),
            toolCallCount: Math.max(0, Number(server?.tool_call_count ?? server?.request_count) || 0),
            errorCount: Math.max(0, Number(server?.error_count) || 0),
            totalOutputSize: Math.max(0, Number(server?.total_output_size) || 0),
            maxOutputSize: Math.max(0, Number(server?.max_output_size) || 0),
          })).filter((server) => server.serverName)
          : [];
        telemetry.mcp.calls = Array.isArray(toolUsage.tool_calls)
          ? toolUsage.tool_calls.map((call) => ({
            timestamp: firstText(call?.timestamp),
            serverName: firstText(call?.server_name),
            toolName: firstText(call?.tool_name),
            status: firstText(call?.status),
            outputSize: call?.output_size != null && Number.isFinite(Number(call.output_size))
              ? Math.max(0, Number(call.output_size))
              : null,
          })).filter((call) => call.serverName || call.toolName)
          : [];
        const integrity = toolUsage.integrity;
        if (integrity && typeof integrity === "object") {
          telemetry.integrity.available = true;
          telemetry.integrity.summary = integrity;
        }
        telemetry.integrity.totalToolCalls = Array.isArray(toolUsage.summary)
          ? toolUsage.summary.reduce((total, tool) => total + Math.max(0, Number(tool.call_count) || 0), 0)
          : 0;
        const guardPolicy = toolUsage.guard_policy_summary;
        if (guardPolicy && typeof guardPolicy === "object") {
          telemetry.accessControl.available = true;
          telemetry.accessControl.guardPolicy = guardPolicy;
        }
      }
      if (Array.isArray(summary.mcp_failures)) {
        telemetry.mcp.failures = summary.mcp_failures.map((failure) => ({
          serverName: firstText(failure?.server_name),
          status: firstText(failure?.status),
        })).filter((failure) => failure.serverName);
        if (telemetry.mcp.failures.length > 0) telemetry.mcp.available = true;
      }
    } catch {
      // Missing or malformed optional telemetry is represented as unavailable.
    }
  }

  const agentLogs = files.filter((file) => path.basename(file) === "agent-stdio.log");
  if (agentLogs.length > 0) telemetry.accessControl.available = true;
  for (const file of agentLogs) {
    const content = await readBounded(file);
    if (content !== null) countPermissionDenials(content, telemetry);
  }

  const detectionFile = files.find((file) => path.basename(file) === "detection_result.json");
  if (detectionFile) {
    const content = await readBounded(detectionFile);
    if (content !== null) try {
      const verdict = JSON.parse(content);
      if (validThreatVerdict(verdict)) {
        telemetry.threatDetection = {
          available: true,
          verdict: {
            promptInjection: verdict.prompt_injection,
            secretLeak: verdict.secret_leak,
            maliciousPatch: verdict.malicious_patch,
            warnings: Array.isArray(verdict.warnings)
              ? verdict.warnings.map((warning) => ({
                field: firstText(warning?.field),
                code: firstText(warning?.code),
              })).filter((warning) => warning.field || warning.code)
              : [],
          },
        };
      }
    } catch {
      // Missing or malformed optional telemetry is represented as unavailable.
    }
  }
  return telemetry;
}

function securityTelemetryComplete(telemetry) {
  return telemetry.accessControl.available
    && telemetry.firewall.available
    && telemetry.integrity.available
    && telemetry.threatDetection.available;
}

async function main() {
  log.group`Collect AI Credit usage`;
  try {
  const inventoryPath = process.env.REPORT_DEPLOYED_WORKFLOWS;
  const outputPath = path.resolve(process.env.REPORT_AIC_USAGE || "_inventory/aic-usage.json");
  const configuredCacheRoot = process.env.REPORT_AIC_CACHE ? path.resolve(process.env.REPORT_AIC_CACHE) : "";
  if (!inventoryPath) throw new Error("REPORT_DEPLOYED_WORKFLOWS is required");

  const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
  const runIdsByRepository = new Map();
  const workflowByRunId = new Map();
  const targets = [];
  let maxRunsPerWorkflow = 0;
  for (const workflow of inventory.workflows || []) {
    const runIds = runIdsByRepository.get(workflow.repository) || new Set();
    const runRecords = new Map((workflow.runHealth?.runRecords || []).map((run) => [Number(run.runId), run]));
    for (const runId of workflow.runHealth?.runIds || []) {
      runIds.add(runId);
      const metadata = { workflow, run: runRecords.get(Number(runId)) || null };
      workflowByRunId.set(Number(runId), metadata);
    }
    runIdsByRepository.set(workflow.repository, runIds);
    if (workflow.runHealth?.runIds?.length > 0) {
      targets.push(`${workflow.repository}/${workflow.path}`);
      maxRunsPerWorkflow = Math.max(maxRunsPerWorkflow, workflow.runHealth.runIds.length);
    }
  }

  const runs = new Map();
  const securityRuns = new Map();
  const temporaryRoot = configuredCacheRoot || await mkdtemp(path.join(os.tmpdir(), "pages-aic-"));
  await mkdir(temporaryRoot, { recursive: true });
  try {
    let collectionAvailable = true;
    if (targets.length > 0) {
      try {
        const result = JSON.parse(await runGhAw(targets, maxRunsPerWorkflow, temporaryRoot));
        for (const run of result.runs || []) {
          const runId = Number(run.database_id ?? run.run_id ?? run.id);
          const aic = Number(run.aic);
          const metadata = workflowByRunId.get(runId);
          if (!Number.isFinite(runId) || !metadata) continue;
          const repository = metadata.workflow.repository;
          const mode = parseRolloutMode(metadata.run?.displayTitle);
          const common = {
            repository,
            runId,
            workflowName: run.workflow_name || run.workflow || metadata.workflow.name || null,
            workflowPath: metadata.workflow.path || null,
            mode,
            conclusion: metadata.run?.conclusion || null,
            createdAt: run.created_at || run.started_at || metadata.run?.createdAt || null,
            engine: firstText(run.engine, run.agentic_engine, run.agent_engine),
            engineVersion: firstText(run.engine_version, run.agentic_engine_version, run.agent_engine_version, run.agent_version),
            requestedModel: firstText(run.requested_model, run.requestedModel, run.model, run.model_name),
            resolvedModel: firstText(run.resolved_model, run.resolvedModel, run.model_resolved, run.model),
            agentRuntime: firstText(run.agent_runtime, run.agentRuntime),
            safeItemsCount: Number(run.safe_items_count) || 0,
            noopCount: Number(run.noop_count) || 0,
            missingDataCount: Number(run.missing_data_count) || 0,
            missingToolCount: Number(run.missing_tool_count) || 0,
            reportIncompleteCount: Number(run.report_incomplete_count) || 0,
            data: run.data ?? null,
          };
          if (Number.isFinite(aic)) runs.set(`${repository}:${runId}`, {
            ...common,
            aic,
          });
          securityRuns.set(`${repository}:${runId}`, {
            ...common,
            security: await readRunSecurityTelemetry(temporaryRoot, runId),
          });
        }
      } catch (error) {
        collectionAvailable = false;
        log.warning`AI Credit usage unavailable: ${error.message}`;
      }
    }
    const reportedRunsByRepository = Object.groupBy([...runs.values()], (run) => run.repository);
    const repositories = [...runIdsByRepository].map(([repository, runIds]) => {
      const reportedRuns = reportedRunsByRepository[repository]?.length || 0;
      const available = runIds.size === 0 || collectionAvailable;
      return {
        repository,
        selectedRuns: runIds.size,
        reportedRuns,
        available,
        complete: available && reportedRuns === runIds.size,
      };
    });

    const usage = {
      schemaVersion: 3,
      generatedAt: new Date().toISOString(),
      windowStart: inventory.runHealth?.windowStart || null,
      windowHours: inventory.runHealth?.windowHours || null,
      available: repositories.every((entry) => entry.available),
      complete: repositories.every((entry) => entry.complete),
      securityAvailable: collectionAvailable,
      securityComplete: collectionAvailable
        && [...securityRuns.values()].every((run) => securityTelemetryComplete(run.security)),
      mcpAvailable: collectionAvailable,
      mcpComplete: collectionAvailable
        && [...securityRuns.values()].every((run) => run.security.mcp.available),
      repositories,
      runs: [...runs.values()],
      securityRuns: [...securityRuns.values()],
    };
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(usage, null, 2)}\n`);
    log.info`Collected ${usage.runs.length} AIC-bearing runs; coverage ${usage.complete ? "complete" : "partial"}`;
  } finally {
    if (!configuredCacheRoot) await rm(temporaryRoot, { recursive: true, force: true });
  }
  } finally {
    log.endGroup();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    log.error`${error.stack || error.message || error}`;
    process.exitCode = 1;
  });
}