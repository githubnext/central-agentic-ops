import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  collectActivityCacheState,
  recordGithubTelemetry,
} from "../../activity/github-telemetry.mjs";

test("GitHub telemetry records rate-limit and bounded cache metadata without token values", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "cao-gh-"));
  const cacheRoot = path.join(root, "cache");
  const ledgerPath = path.join(cacheRoot, "cao-gh.jsonl");
  await mkdir(path.join(cacheRoot, "runs"), { recursive: true });
  await writeFile(path.join(cacheRoot, "runs", "one.json"), "{}\n");
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
    assert.deepEqual(entry.activityCache.folders, ["runs"]);
    assert.deepEqual(entry.rateLimit.core, {
      limit: 5_000,
      used: 125,
      remaining: 4_875,
      resetAt: "2026-09-03T22:40:00.000Z",
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
    files: 0,
    folders: [],
    folderCount: 0,
    oldestModifiedAt: null,
    newestModifiedAt: null,
  });
});
