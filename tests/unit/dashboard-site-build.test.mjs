import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { buildDashboardSite } from "../../dashboard/site/scripts/build.mjs";

test("docs dashboard includes package-contributed pages and navigation", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "dashboard-site-build-"));
  const destination = pathToFileURL(`${root}/cao/`);

  try {
    await buildDashboardSite({ destination });
    const dashboard = JSON.parse(await readFile(new URL("dashboard.json", destination), "utf8"));
    const packagePages = [
      "advisory-dashboard",
      "ambient-context-dashboard",
      "aw-maintenance-dashboard",
      "dependabot-dashboard",
      "eu-cra-compliance-dashboard",
      "optimization-dashboard",
    ];

    assert.deepEqual(
      dashboard.dashboard.pages.map(({ id }) => id).filter((id) => packagePages.includes(id)),
      packagePages,
    );
    assert.deepEqual(
      dashboard.dashboard.navigation.find(({ label }) => label === "Package operations")?.pages,
      packagePages,
    );
    for (const page of packagePages) {
      assert.match(await readFile(new URL(`${page}/index.html`, destination), "utf8"), new RegExp(`#page-${page}`));
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
