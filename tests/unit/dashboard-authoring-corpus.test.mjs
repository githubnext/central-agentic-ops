import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");

test("generate-dashboard-ir corpus is indexed and valid", () => {
  execFileSync("npm", ["--prefix", "dashboard/site", "run", "validate:corpus"], {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
  });
});

test("every production dashboard page starts with a visual executive summary", () => {
  const executiveSummaryCharts = new Set(["pie", "line", "histogram"]);
  const dashboardFiles = [
    join(root, "dashboard/site/dashboard.json"),
    ...readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(root, entry.name, "dashboard.json"))
      .filter((path) => existsSync(path)),
  ];

  for (const path of dashboardFiles) {
    const document = JSON.parse(readFileSync(path, "utf8"));
    for (const page of document.dashboard.pages) {
      const views = page.kind === "built-in" ? page.definition?.views : page.views;
      const summary = views?.[0];
      assert.ok(summary, `${path}: page "${page.id}" must contain a view`);
      assert.ok(
        summary.mark === "chart" && executiveSummaryCharts.has(summary.chart),
        `${path}: page "${page.id}" must start with a pie, line, or histogram chart`,
      );
    }
  }
});
