import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { firstText } from "./text-utils.mjs";

function runGhAw(repository, runIds, outputDirectory) {
  return new Promise((resolve, reject) => {
    const child = spawn("gh", [
      "aw", "logs", "--repo", repository, "--stdin", "--json",
      "--output", outputDirectory, "--summary-file", "",
      "--start-date", "-2d", "--cache-before", "-2d",
    ], { env: process.env, stdio: ["pipe", "pipe", "pipe"] });
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
    child.stdin.end(`${[...runIds].join("\n")}\n`);
  });
}

async function mapWithConcurrency(values, concurrency, mapper) {
  const results = new Array(values.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(values[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return results;
}

(async () => {
  const inventoryPath = process.env.REPORT_DEPLOYED_WORKFLOWS;
  const outputPath = path.resolve(process.env.REPORT_AIC_USAGE || "_inventory/aic-usage.json");
  const configuredCacheRoot = process.env.REPORT_AIC_CACHE ? path.resolve(process.env.REPORT_AIC_CACHE) : "";
  const requestedConcurrency = Number(process.env.REPORT_AIC_CONCURRENCY || 3);
  const concurrency = Number.isInteger(requestedConcurrency) && requestedConcurrency > 0
    ? Math.min(requestedConcurrency, 8)
    : 3;
  if (!inventoryPath) throw new Error("REPORT_DEPLOYED_WORKFLOWS is required");

  const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
  const runIdsByRepository = new Map();
  const workflowByRun = new Map();
  for (const workflow of inventory.workflows || []) {
    const runIds = runIdsByRepository.get(workflow.repository) || new Set();
    const runRecords = new Map((workflow.runHealth?.runRecords || []).map((run) => [Number(run.runId), run]));
    for (const runId of workflow.runHealth?.runIds || []) {
      runIds.add(runId);
      workflowByRun.set(`${workflow.repository}:${runId}`, { workflow, run: runRecords.get(Number(runId)) || null });
    }
    runIdsByRepository.set(workflow.repository, runIds);
  }

  const runs = new Map();
  const temporaryRoot = configuredCacheRoot || await mkdtemp(path.join(os.tmpdir(), "pages-aic-"));
  await mkdir(temporaryRoot, { recursive: true });
  try {
    const repositories = await mapWithConcurrency([...runIdsByRepository], concurrency, async ([repository, runIds]) => {
      if (runIds.size === 0) {
        return { repository, selectedRuns: 0, reportedRuns: 0, available: true, complete: true };
      }
      try {
        const stdout = await runGhAw(repository, runIds, path.join(temporaryRoot, repository.replace("/", "-")));
        const result = JSON.parse(stdout);
        let reportedRuns = 0;
        for (const run of result.runs || []) {
          const runId = Number(run.database_id ?? run.run_id ?? run.id);
          const aic = Number(run.aic);
          if (!Number.isFinite(runId) || !Number.isFinite(aic)) continue;
          const metadata = workflowByRun.get(`${repository}:${runId}`);
          const mode = metadata?.run?.displayTitle?.match(/(?:^|\s[·|:-]\s)(review|live)$/i)?.[1]?.toLowerCase() || null;
          runs.set(`${repository}:${runId}`, {
            repository,
            runId,
            workflowName: run.workflow_name || run.workflow || metadata?.workflow?.name || null,
            workflowPath: metadata?.workflow?.path || null,
            mode,
            conclusion: metadata?.run?.conclusion || null,
            createdAt: run.created_at || run.started_at || metadata?.run?.createdAt || null,
            engine: firstText(run.engine, run.agentic_engine, run.agent_engine),
            engineVersion: firstText(run.engine_version, run.agentic_engine_version, run.agent_engine_version, run.agent_version),
            requestedModel: firstText(run.requested_model, run.requestedModel, run.model, run.model_name),
            resolvedModel: firstText(run.resolved_model, run.resolvedModel, run.model_resolved, run.model),
            aic,
          });
          reportedRuns += 1;
        }
        return {
          repository,
          selectedRuns: runIds.size,
          reportedRuns,
          available: true,
          complete: reportedRuns === runIds.size,
        };
      } catch (error) {
        console.warn(`AI Credit usage unavailable for ${repository}: ${error.message}`);
        return { repository, selectedRuns: runIds.size, reportedRuns: 0, available: false, complete: false };
      }
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
    console.log(`Collected ${usage.runs.length} AIC-bearing runs with concurrency ${concurrency}; coverage ${usage.complete ? "complete" : "partial"}`);
  } finally {
    if (!configuredCacheRoot) await rm(temporaryRoot, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});