import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { parse } from "yaml";
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

    const manifest = parse(await readFile(new URL("../../dashboard/aw.yml", import.meta.url), "utf8"));
    const installedSitePrefix = ".github/aw/dashboard/site/";
    for (const resource of manifest.resources.filter(({ destination: path }) => path.startsWith(installedSitePrefix))) {
      await access(new URL(resource.destination.slice(installedSitePrefix.length), destination));
    }
    await assert.rejects(
      readFile(new URL("README.md", destination), "utf8"),
      (error) => error?.code === "ENOENT",
      "build copied a dashboard source that gh aw add would not install",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
