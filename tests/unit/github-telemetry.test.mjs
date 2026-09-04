import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  collectActivityCacheState,
  prepareGithubTelemetryHistory,
  recordGithubTelemetry,
} from "../../activity/github-telemetry.mjs";

test("GitHub telemetry records rate-limit and bounded cache metadata without token values", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "cao-gh-"));
  const cacheRoot = path.join(root, "cache");
  const ledgerPath = path.join(cacheRoot, "cao-gh.jsonl");
  await mkdir(path.join(cacheRoot, "runs"), { recursive: true });
  await writeFile(path.join(cacheRoot, "runs", "one.json"), "{}\n");
  await writeFile(path.join(cacheRoot, "control-settings.json"), "{}\n");
  try {
    const entry = await recordGithubTelemetry({
      phase: "before",
      operation: "refresh-activity",
      token: "secret-token-value",
      tokenType: "app",
      cacheRoot,
      ledgerPath,
      now: () => new Date("2026-09-04T12:00:00Z"),
      execute: () => ({
        status: 0,
        stdout: JSON.stringify({
          resources: {
            core: { limit: 5_000, used: 125, remaining: 4_875, reset: 1_788_528_000 },
          },
        }),
      }),
    });

    assert.equal(entry.activityCache.hydrated, true);
    assert.equal(entry.activityCache.entryCount, 2);
    assert.equal(entry.activityCache.folderCount, 1);
    assert.ok(entry.activityCache.bytes > 0);
    assert.deepEqual(entry.rateLimit.core, {
      limit: 5_000,
      used: 125,
      remaining: 4_875,
      resetAt: "2026-09-04T13:20:00.000Z",
    });
    const ledger = await readFile(ledgerPath, "utf8");
    assert.doesNotMatch(ledger, /secret-token-value/);
    assert.deepEqual(JSON.parse(ledger), entry);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("activity cache state is explicit when the cache is absent", async () => {
  assert.deepEqual(await collectActivityCacheState("/path/that/does/not/exist"), {
    hydrated: false,
    bytes: 0,
    entryCount: 0,
    folderCount: 0,
  });

  test("GitHub telemetry retains only valid observations from the last 24 hours", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cao-gh-history-"));
    const sourcePath = path.join(root, "prior.jsonl");
    const ledgerPath = path.join(root, "next", "cao-gh.jsonl");
    const recent = { schemaVersion: 1, observedAt: "2026-09-04T11:00:00Z", rateLimit: {} };
    await writeFile(sourcePath, [
      JSON.stringify({ ...recent, observedAt: "2026-09-03T11:59:59Z" }),
      JSON.stringify(recent),
      JSON.stringify({ ...recent, observedAt: "2026-09-04T12:00:01Z" }),
      JSON.stringify({ ...recent, schemaVersion: 2 }),
      "invalid",
    ].join("\n"));
    try {
      assert.equal(await prepareGithubTelemetryHistory({
        sourcePath,
        ledgerPath,
        now: () => new Date("2026-09-04T12:00:00Z"),
      }), 1);
      assert.deepEqual(JSON.parse(await readFile(ledgerPath, "utf8")), recent);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("GitHub telemetry diagnoses an empty rate-limit response", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cao-gh-empty-"));
    try {
      const entry = await recordGithubTelemetry({
        phase: "before",
        operation: "refresh-activity",
        cacheRoot: root,
        ledgerPath: path.join(root, "cao-gh.jsonl"),
        execute: () => ({ status: 0, stdout: JSON.stringify({ resources: {} }) }),
      });
      assert.deepEqual(entry.rateLimit, {});
      assert.equal(entry.rateLimitError, "GitHub API returned no valid rate-limit resources.");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
