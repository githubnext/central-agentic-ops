import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { actionsLog as log } from "../../activity/activity.mjs";
import { firstText } from "./text-utils.mjs";

function runGhAw(targets, maxRunsPerWorkflow, outputDirectory) {
  return new Promise((resolve, reject) => {
    const child = spawn("gh", [
      "aw", "logs", "--json",
      "--output", outputDirectory, "--summary-file", "",
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

(async () => {
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
          if (!Number.isFinite(runId) || !Number.isFinite(aic) || !metadata) continue;
          const repository = metadata.workflow.repository;
          const mode = metadata.run?.displayTitle?.match(/(?:^|\s[·|:-]\s)(review|live)$/i)?.[1]?.toLowerCase() || null;
          runs.set(`${repository}:${runId}`, {
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
            aic,
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
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      windowStart: inventory.runHealth?.windowStart || null,
      windowHours: inventory.runHealth?.windowHours || null,
      available: repositories.every((entry) => entry.available),
      complete: repositories.every((entry) => entry.complete),
      repositories,
      runs: [...runs.values()],
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
})().catch((error) => {
  log.error`${error.stack || error.message || error}`;
  process.exitCode = 1;
});