import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { startDashboardServer } from "../../dashboard/local-server.mjs";

const dashboard = (pageId) => JSON.stringify({
  "language-version": "1.0",
  dashboard: {
    navigation: [{ label: "Preview", pages: [pageId] }],
    pages: [{ id: pageId, title: pageId, route: pageId, views: [] }],
  },
}, null, 2);

async function waitForReload(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let content = "";
  while (!content.includes("event: reload")) {
    const { done, value } = await reader.read();
    if (done) throw new Error("live reload stream ended before an update");
    content += decoder.decode(value, { stream: true });
  }
  await reader.cancel();
}

test("local dashboard server composes package dashboards and reloads after updates", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "dashboard-local-server-"));
  const siteRoot = path.join(root, "site");
  const packageRoot = path.join(root, "packages");
  const packageDirectory = path.join(packageRoot, "example");
  await mkdir(packageDirectory, { recursive: true });
  await mkdir(siteRoot, { recursive: true });
  await writeFile(path.join(siteRoot, "index.html"), "<!doctype html><body>preview</body>");
  await writeFile(path.join(siteRoot, "dashboard.json"), dashboard("built-in"));
  await writeFile(path.join(packageDirectory, "dashboard.json"), dashboard("package-one"));

  const preview = await startDashboardServer({
    siteRoot,
    catalogRoot: packageRoot,
    installedDashboardsDirectory: path.join(root, "installed-dashboards"),
    port: 0,
  });
  try {
    const indexResponse = await fetch(`${preview.url}/?fixtures`);
    assert.equal(indexResponse.status, 200);
    assert.match(await indexResponse.text(), /new EventSource\("\/__dashboard_events"\)/);

    const dashboardResponse = await fetch(`${preview.url}/dashboard.json`);
    assert.equal(dashboardResponse.headers.get("cache-control"), "no-store");
    assert.deepEqual(
      (await dashboardResponse.json()).dashboard.pages.map(({ id }) => id),
      ["built-in", "package-one"],
    );

    const traversalResponse = await fetch(`${preview.url}/..%2Foutside.txt`);
    assert.equal(traversalResponse.status, 404);

    const eventsResponse = await fetch(`${preview.url}/__dashboard_events`);
    const reload = waitForReload(eventsResponse);
    await writeFile(path.join(packageDirectory, "dashboard.json"), dashboard("package-two"));
    await reload;

    const updatedResponse = await fetch(`${preview.url}/dashboard.json`);
    assert.deepEqual(
      (await updatedResponse.json()).dashboard.pages.map(({ id }) => id),
      ["built-in", "package-two"],
    );
  } finally {
    await preview.close();
    await rm(root, { recursive: true, force: true });
  }
});
