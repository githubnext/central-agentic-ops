import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { actionsLog as log } from "../../activity/actions-log.mjs";
import {
  definitionFromOperationalValueReport,
  mergeOperationalValueRecords,
  operationalValueRunIdentity,
  recordsFromOperationalValueReport,
} from "./operational-value-history.mjs";

function downloadAgentArtifact(repository, runId, destination) {
  return runCommand("gh", ["run", "download", String(runId), "--repo", repository, "--name", "agent", "--dir", destination]);
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (code === 0 && !signal) {
        resolve(Buffer.concat(stdout).toString("utf8"));
        return;
      }
      reject(new Error(Buffer.concat(stderr).toString("utf8").trim() || `${command} exited with ${signal || code}`));
    });
  });
}

async function findResultsFile(directory) {
  const entries = await readdir(directory, { recursive: true });
  const matches = entries.filter((entry) => entry.endsWith("grader_results.json"));
  if (matches.length !== 1) return null;
  return path.join(directory, matches[0]);
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

function normalizeResult(selected, result, source = "run") {
  const value = Number.isFinite(result.value) && result.value >= 0 && result.value <= 1 ? result.value : null;
  return {
    schemaVersion: 1,
    repository: selected.repository,
    workflowId: selected.workflowId,
    workflowPath: selected.workflowPath || null,
    runId: selected.runId,
    runAttempt: selected.run?.runAttempt || selected.runAttempt || 1,
    runUrl: `https://github.com/${selected.repository}/actions/runs/${selected.runId}`,
    status: result.status || "unavailable",
    value,
    baselineValue: Number.isFinite(result.baselineValue) ? result.baselineValue : null,
    deltaFromBaseline: Number.isFinite(result.deltaFromBaseline) ? result.deltaFromBaseline : null,
    evaluatorDigest: result.implementation?.digest || null,
    observation: result.observation || null,
    observationSource: source,
    diagnostics: result.diagnostics || {},
    error: result.error || null,
  };
}

function observationTime(record) {
  return Date.parse(record.observation?.evidenceAt || record.run?.createdAt || "");
}

function regradeDue(record, evidenceAt) {
  const maturesAt = Date.parse(record.observation?.maturesAt || "");
  const unavailableReplay = record.observationSource === "regrade"
    && (record.status === "unavailable" || record.value === null);
  return record.observation
    && (record.observation.mature !== true || unavailableReplay)
    && Number.isFinite(maturesAt)
    && maturesAt <= Date.parse(evidenceAt);
}

async function regradeSupported() {
  try {
    await runGhAw(["graders", "operational-value", "--help"]);
    return true;
  } catch {
    return false;
  }
}

async function reportSupported() {
  try {
    await runGhAw(["graders", "operational-value", "report", "--help"]);
    return true;
  } catch {
    return false;
  }
}

function runGhAw(args, options = {}) {
  const executable = process.env.REPORT_GH_AW_BIN;
  return executable
    ? runCommand(executable, args, options)
    : runCommand("gh", ["aw", ...args], options);
}

async function prepareTrustedCheckout(record, temporaryRoot) {
  const repository = record.observation?.subject?.repository || record.repository;
  const sha = record.observation?.subject?.sha;
  if (!repository || !sha || !/^[0-9a-f]{40}$/i.test(sha)) {
    throw new Error("operational-value observation has no trusted repository commit");
  }
  const checkout = path.join(temporaryRoot, "checkouts", `${repository.replace("/", "-")}-${sha}`);
  await mkdir(path.dirname(checkout), { recursive: true });
  await runCommand("gh", ["repo", "clone", repository, checkout, "--", "--filter=blob:none", "--no-checkout", "--depth=1"]);
  try {
    await runCommand("git", ["-C", checkout, "cat-file", "-e", `${sha}^{commit}`]);
  } catch {
    await runCommand("git", ["-C", checkout, "fetch", "--depth=1", "origin", sha]);
  }
  return checkout;
}

async function prepareRuntimeCheckout(repository, temporaryRoot) {
  if (repository === process.env.GITHUB_REPOSITORY) return process.cwd();
  const checkout = path.join(temporaryRoot, "runtime-checkouts", repository.replace("/", "-"));
  await mkdir(path.dirname(checkout), { recursive: true });
  await runCommand("gh", ["repo", "clone", repository, checkout, "--", "--filter=blob:none", "--depth=1"]);
  return checkout;
}

async function collectWorkflowReport(workflow, generatedAt, cacheRoot, temporaryRoot, checkout) {
  const outputDirectory = path.join(temporaryRoot, "reports", `${workflow.repository.replace("/", "-")}-${workflow.workflowId}`);
  const output = await runGhAw([
    "graders", "operational-value", "report", workflow.workflowId,
    "--repo", workflow.repository,
    "--until", generatedAt,
    "--cache-dir", cacheRoot,
    "--output", outputDirectory,
    "--json",
  ], { cwd: checkout });
  const parsed = JSON.parse(output);
  if (parsed.report?.schemaVersion !== 1) throw new Error("unsupported gh-aw operational-value report output");
  return parsed.report;
}

async function regradeRecord(record, evidenceAt, checkout) {
  const output = await runGhAw([
    "graders", "operational-value", String(record.runId),
    "--repo", record.repository,
    "--evidence-at", evidenceAt,
    "--json",
  ], { cwd: checkout });
  const artifact = JSON.parse(output);
  const matches = (artifact.results || []).filter((result) => result.id === "operational-value" && result.source === "operational-value");
  if (artifact.version !== 1 || matches.length !== 1) throw new Error("unsupported operational-value regrade result");
  return {
    ...normalizeResult(record, matches[0], "regrade"),
    originalEvidenceAt: artifact.regrade?.originalEvidenceAt || record.observation?.evidenceAt || null,
    regradedAt: evidenceAt,
  };
}

(async () => {
  log.group`Collect operational-value observations`;
  try {
  const inventoryPath = process.env.REPORT_DEPLOYED_WORKFLOWS;
  const outputPath = path.resolve(process.env.REPORT_OPERATIONAL_VALUES || "_inventory/operational-values.json");
  const cachePath = process.env.REPORT_VALUE_CACHE ? path.resolve(process.env.REPORT_VALUE_CACHE) : null;
  const requestedConcurrency = Number(process.env.REPORT_VALUE_CONCURRENCY || 3);
  const concurrency = Number.isInteger(requestedConcurrency) && requestedConcurrency > 0
    ? Math.min(requestedConcurrency, 8)
    : 3;
  if (!inventoryPath) throw new Error("REPORT_DEPLOYED_WORKFLOWS is required");

  const generatedAt = new Date().toISOString();
  const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
  const operationalWorkflows = [];
  const selectedRuns = [];
  const seen = new Set();
  for (const workflow of inventory.workflows || []) {
    if (workflow.operationalValue !== true) continue;
    const workflowId = workflow.path?.split("/").at(-1)?.replace(/\.lock\.yml$/, "");
    if (!workflowId) continue;
    operationalWorkflows.push({ repository: workflow.repository, workflowId, workflowPath: workflow.path });
    const runRecords = new Map((workflow.runHealth?.runRecords || []).map((run) => [Number(run.runId), run]));
    for (const runId of workflow.runHealth?.runIds || []) {
      const key = `${workflow.repository}:${runId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      selectedRuns.push({
        repository: workflow.repository,
        runId: Number(runId),
        workflowId,
        workflowPath: workflow.path,
        run: runRecords.get(Number(runId)) || null,
      });
    }
  }

  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "pages-operational-values-"));
  try {
    let cachedRecords = [];
    let cachedDefinitions = [];
    if (cachePath) {
      try {
        const cached = JSON.parse(await readFile(cachePath, "utf8"));
        if (cached.schemaVersion === 1 && Array.isArray(cached.records)) {
          cachedRecords = cached.records;
          cachedDefinitions = Array.isArray(cached.definitions) ? cached.definitions : [];
        }
      } catch (error) {
        if (error.code !== "ENOENT") log.warning`Ignoring operational-value cache: ${error.message}`;
      }
    }

    const canReport = await reportSupported();
    const reportCacheRoot = path.resolve(process.env.REPORT_VALUE_REPLAY_CACHE || path.join(path.dirname(cachePath || outputPath), "replay"));
    const checkoutPromises = new Map();
    const reportResults = canReport
      ? await mapWithConcurrency(operationalWorkflows, concurrency, async (workflow) => {
        if (!checkoutPromises.has(workflow.repository)) {
          checkoutPromises.set(workflow.repository, prepareRuntimeCheckout(workflow.repository, temporaryRoot));
        }
        try {
          const report = await collectWorkflowReport(
            workflow,
            generatedAt,
            reportCacheRoot,
            temporaryRoot,
            await checkoutPromises.get(workflow.repository),
          );
          return { workflow, report };
        } catch (error) {
          log.warning`Operational-value history unavailable for ${workflow.repository} ${workflow.workflowId}: ${error.message}`;
          return { workflow, error: error.message };
        }
      })
      : operationalWorkflows.map((workflow) => ({ workflow, error: "gh-aw report is unavailable" }));
    const reports = reportResults.filter((result) => result.report).map((result) => result.report);
    const reportedWorkflowKeys = new Set(reportResults
      .filter((result) => result.report)
      .map((result) => `${result.workflow.repository}:${result.workflow.workflowId}`));
    const fallbackRuns = selectedRuns.filter((selected) => !reportedWorkflowKeys.has(`${selected.repository}:${selected.workflowId}`));
    const reportRecords = reports.flatMap(recordsFromOperationalValueReport);
    const reportDefinitions = reports.map(definitionFromOperationalValueReport);
    const cachedRunKeys = new Set(cachedRecords
      .filter((record) => record.observation)
      .map(operationalValueRunIdentity));
    const currentRecords = await mapWithConcurrency(fallbackRuns.filter((selected) => !cachedRunKeys.has(operationalValueRunIdentity(selected))), concurrency, async (selected) => {
      const destination = path.join(temporaryRoot, `${selected.repository.replace("/", "-")}-${selected.runId}`);
      await mkdir(destination, { recursive: true });
      try {
        await downloadAgentArtifact(selected.repository, selected.runId, destination);
        const resultsPath = await findResultsFile(destination);
        if (!resultsPath) return { ...selected, status: "unavailable", reason: "grader results not found" };
        const artifact = JSON.parse(await readFile(resultsPath, "utf8"));
        if (artifact.version !== 1 || !Array.isArray(artifact.results)) {
          return { ...selected, status: "unavailable", reason: "unsupported grader results" };
        }
        const matches = artifact.results.filter((result) => result.id === "operational-value" && result.source === "operational-value");
        if (matches.length !== 1) return { ...selected, status: "unavailable", reason: "operational-value result not found" };
        return normalizeResult(selected, matches[0]);
      } catch (error) {
        log.warning`Operational value unavailable for ${selected.repository} run ${selected.runId}: ${error.message}`;
        return { ...selected, status: "unavailable", reason: error.message };
      }
    });

    let records = mergeOperationalValueRecords(cachedRecords, currentRecords, reportRecords);
    const replayAvailable = await regradeSupported();
    const dueRecords = records.filter((record) => record.observationSource !== "report" && regradeDue(record, generatedAt));
    if (replayAvailable && dueRecords.length) {
      const checkouts = new Map();
      const replayed = await mapWithConcurrency(dueRecords, concurrency, async (record) => {
        const checkoutKey = `${record.observation.subject?.repository || record.repository}:${record.observation.subject?.sha || ""}`;
        if (!checkouts.has(checkoutKey)) {
          checkouts.set(checkoutKey, prepareTrustedCheckout(record, temporaryRoot));
        }
        try {
          return await regradeRecord(record, generatedAt, await checkouts.get(checkoutKey));
        } catch (error) {
          log.warning`Operational-value regrade unavailable for ${record.repository} run ${record.runId}: ${error.message}`;
          return { ...record, regradeAttemptedAt: generatedAt, regradeError: error.message };
        }
      });
      records = mergeOperationalValueRecords(records, replayed);
    }

    const definitions = mergeDefinitions(cachedDefinitions, reportDefinitions);
    const windowStarts = reports.map((report) => report.window?.startAt).filter(Boolean).sort();
    const windowEnds = reports.map((report) => report.window?.endAt).filter(Boolean).sort();
    const complete = operationalWorkflows.length === reports.length;

    const output = {
      schemaVersion: 1,
      generatedAt,
      window: {
        startAt: windowStarts[0] || inventory.runHealth?.windowStart || null,
        endAt: windowEnds.at(-1) || generatedAt,
      },
      complete,
      collectionMode: complete ? "full-history" : reports.length > 0 ? "mixed" : "recent-artifacts",
      selectedRuns: reports.reduce((total, report) => total + (report.coverage?.runCount || 0), fallbackRuns.length),
      observedRuns: records.filter((record) => record.observation).length,
      matureRuns: records.filter((record) => record.observation?.mature).length,
      regradedRuns: records.filter((record) => record.observationSource === "regrade").length,
      pendingRegrades: records.filter((record) => regradeDue(record, generatedAt)).length,
      regradeAvailable: replayAvailable,
      reportsCollected: reports.length,
      reportsFailed: reportResults.length - reports.length,
      definitions,
      records,
    };
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
    if (cachePath) {
      await mkdir(path.dirname(cachePath), { recursive: true });
      await writeFile(cachePath, `${JSON.stringify(output, null, 2)}\n`);
    }
    log.info`Collected ${output.observedRuns} operational-value observations from ${output.selectedRuns} worker runs`;
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
  } finally {
    log.endGroup();
  }
})().catch((error) => {
  log.error`${error.stack || error.message || error}`;
  process.exitCode = 1;
});

function mergeDefinitions(...definitionSets) {
  const definitions = new Map();
  for (const definition of definitionSets.flat()) {
    const key = `${definition.repository}:${definition.workflowId}:${definition.evaluatorDigest || "unknown-evaluator"}`;
    definitions.set(key, definition);
  }
  return [...definitions.values()];
}