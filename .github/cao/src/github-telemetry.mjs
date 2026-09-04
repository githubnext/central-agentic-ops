#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { appendFile, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function cacheState(root) {
  const entries = await readdir(root, { withFileTypes: true }).catch((error) => {
    if (error?.code === "ENOENT") return [];
    throw error;
  });
  let bytes = 0;
  let files = 0;
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const metadata = await stat(path.join(root, entry.name));
    bytes += metadata.size;
    files += 1;
  }
  return {
    hydrated: entries.length > 0,
    bytes,
    files,
    folders: entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort(),
    key: process.env.CAO_ACTIVITY_CACHE_KEY || null,
    matchedKey: process.env.CAO_ACTIVITY_CACHE_MATCHED_KEY || null,
    hit: Boolean(process.env.CAO_ACTIVITY_CACHE_MATCHED_KEY),
  };
}

function rateLimit(token) {
  const result = spawnSync("gh", ["api", "rate_limit"], {
    encoding: "utf8",
    env: token ? { ...process.env, GH_TOKEN: token } : process.env,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr?.trim() || `gh api rate_limit exited with status ${result.status}`);
  const resources = {};
  for (const [name, value] of Object.entries(JSON.parse(result.stdout)?.resources || {})) {
    if (![value?.limit, value?.remaining, value?.reset].every(Number.isSafeInteger)) continue;
    resources[name] = {
      limit: value.limit,
      used: Number.isSafeInteger(value.used) ? value.used : Math.max(0, value.limit - value.remaining),
      remaining: value.remaining,
      resetAt: new Date(value.reset * 1000).toISOString(),
    };
  }
  return resources;
}

export async function recordGithubTelemetry(phase, operation) {
  const token = process.env.CAO_API_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";
  let limits = {};
  /** @type {string | null} */
  let rateLimitError = null;
  try {
    limits = rateLimit(token);
  } catch (error) {
    rateLimitError = error instanceof Error ? error.message : String(error);
  }
  const ledger = process.env.CAO_GH_LEDGER || path.join(process.env.RUNNER_TEMP || "/tmp", "cao-gh", "cao-gh.jsonl");
  const entry = {
    schemaVersion: 1,
    observedAt: new Date().toISOString(),
    pairId: [
      process.env.GITHUB_RUN_ID || "local",
      process.env.GITHUB_RUN_ATTEMPT || "1",
      process.env.GITHUB_JOB || "unknown",
      operation,
    ].join(":"),
    phase,
    operation,
    outcome: process.env.CAO_OPERATION_OUTCOME || "unknown",
    tokenType: process.env.CAO_GITHUB_TOKEN_TYPE || "unknown",
    credentialRole: process.env.CAO_GITHUB_CREDENTIAL_ROLE || "unknown",
    repository: process.env.GITHUB_REPOSITORY || null,
    workflow: process.env.GITHUB_WORKFLOW || null,
    job: process.env.GITHUB_JOB || null,
    runId: process.env.GITHUB_RUN_ID || null,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT || null,
    rateLimit: limits,
    rateLimitError,
    activityCache: await cacheState(process.env.CAO_ACTIVITY_CACHE_ROOT || path.join(process.env.RUNNER_TEMP || "/tmp", "cao-activity")),
  };
  await mkdir(path.dirname(ledger), { recursive: true });
  await appendFile(ledger, `${JSON.stringify(entry)}\n`, { mode: 0o600 });
}

async function main() {
  const [phase, operation] = process.argv.slice(2);
  if (!["before", "after"].includes(phase) || !operation) throw new Error("usage: github-telemetry.mjs <before|after> <operation>");
  await recordGithubTelemetry(phase, operation);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
