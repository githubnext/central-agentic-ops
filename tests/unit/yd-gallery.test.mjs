import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const repositoryRoot = new URL("../../", import.meta.url);

test("yd gallery reloads the selected example", async () => {
  const source = await readFile(new URL("public/yd.html", repositoryRoot), "utf8");

  assert.match(source, /url\.searchParams\.set\("example", example\.entry\.id\)/);
  assert.match(source, /window\.location\.assign\(url\)/);
});

test("workflow permission drift example supplies every dashboard source", async () => {
  const metadata = JSON.parse(await readFile(
    new URL(
      ".github/skills/dashboard-authoring/corpus/examples/workflow-permission-drift-remediation.json",
      repositoryRoot,
    ),
    "utf8",
  ));

  for (const source of ["runs", "findings", "outcomes", "operational-values"]) {
    assert.ok(metadata.logicalSources[source]?.rows.length > 0, `${source} should contain demo rows`);
  }
});
