import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { request } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { startDashboardServer } from "../../dashboard/local-server.mjs";

const dashboard = (pageId) => JSON.stringify({
  "language-version": "0.1.0",
  dashboard: {
    id: "preview",
    title: "Preview",
    navigation: [{ label: "Preview", pages: [pageId] }],
    pages: [{
      id: pageId,
      title: pageId,
      kind: "custom",
      views: [{
        id: "summary",
        title: "Summary",
        mark: "element",
        element: "summary-grid",
        data: { sources: ["repositories"] },
      }],
    }],
  },
}, null, 2);

async function openDashboardSocket(previewUrl) {
  const url = new URL(previewUrl);
  url.protocol = "ws:";
  url.pathname += "/__dashboard_socket";
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  return socket;
}

async function nextDashboard(socket) {
  return new Promise((resolve, reject) => {
    socket.addEventListener("message", (event) => resolve(JSON.parse(event.data)), { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
}

async function nextSocketMessage(socket, predicate = () => true) {
  return new Promise((resolve, reject) => {
    const onMessage = (event) => {
      const message = JSON.parse(event.data);
      if (!predicate(message)) return;
      socket.removeEventListener("message", onMessage);
      socket.removeEventListener("error", onError);
      resolve(message);
    };
    const onError = (error) => {
      socket.removeEventListener("message", onMessage);
      reject(error);
    };
    socket.addEventListener("message", onMessage);
    socket.addEventListener("error", onError, { once: true });
  });
}

async function requestWithHost(url, host) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const outgoing = request({
      hostname: target.hostname,
      port: target.port,
      path: target.pathname,
      headers: { Host: host },
    }, (response) => {
      response.resume();
      response.on("end", () => resolve(response.statusCode));
    });
    outgoing.on("error", reject);
    outgoing.end();
  });
}

test("local dashboard server composes package dashboards and reloads after updates", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "dashboard-local-server-"));
  const siteRoot = path.join(root, "site");
  const packageRoot = path.join(root, "packages");
  const packageDirectory = path.join(packageRoot, "example");
  const stalePreviewDirectory = path.join(packageRoot, ".cao-dashboard-preview-stale");
  await mkdir(packageDirectory, { recursive: true });
  await mkdir(stalePreviewDirectory, { recursive: true });
  await mkdir(siteRoot, { recursive: true });
  const syntheticToken = ["ghp", "abcdefghijklmnopqrstuvwxyz123456"].join("_");
  await writeFile(path.join(siteRoot, "index.html"), `<!doctype html><body>preview ${syntheticToken}</body>`);
  await writeFile(path.join(siteRoot, "guide.md"), `# Guide\n\n${syntheticToken}\n`);
  await writeFile(path.join(siteRoot, "image.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  await writeFile(path.join(siteRoot, "private.txt"), "must not be served");
  await writeFile(path.join(siteRoot, "private"), "must not be served");
  const builtInDashboard = JSON.parse(dashboard("built-in"));
  builtInDashboard.dashboard.description = syntheticToken;
  await writeFile(path.join(siteRoot, "dashboard.json"), JSON.stringify(builtInDashboard));
  await writeFile(path.join(packageDirectory, "dashboard.json"), dashboard("package-one"));
  await writeFile(path.join(stalePreviewDirectory, "dashboard.json"), dashboard("built-in"));
  const downloadData = async (destination) => {
    await mkdir(destination, { recursive: true });
    await writeFile(path.join(destination, "sources.json"), JSON.stringify({
      repositories: {
        rows: [{
          token: syntheticToken,
          note: ["github", "pat", "abcdefghijklmnopqrstuvwxyz123456"].join("_"),
        }],
      },
    }));
  };

  const preview = await startDashboardServer({
    siteRoot,
    catalogRoot: packageRoot,
    installedDashboardsDirectory: path.join(root, "installed-dashboards"),
    downloadData,
    workingDirectory: root,
    port: 0,
  });
  try {
    const indexResponse = await fetch(`${preview.url}/`);
    assert.equal(indexResponse.status, 200);
    assert.equal(new URL(indexResponse.url).searchParams.get("local-preview"), "enabled");
    const index = await indexResponse.text();
    assert.doesNotMatch(index, /location\.reload/);
    assert.doesNotMatch(index, /<script[^>]+src=.*copilot-prompt/);
    assert.doesNotMatch(index, new RegExp(syntheticToken));
    assert.match(index, /\[REDACTED\]/);
    const markdownResponse = await fetch(`${preview.url}/guide.md`);
    assert.equal(markdownResponse.status, 200);
    assert.equal(markdownResponse.headers.get("content-type"), "text/markdown; charset=utf-8");
    assert.doesNotMatch(await markdownResponse.text(), new RegExp(syntheticToken));
    const imageResponse = await fetch(`${preview.url}/image.png`);
    assert.equal(imageResponse.status, 200);
    assert.equal(imageResponse.headers.get("content-type"), "image/png");
    assert.deepEqual(Buffer.from(await imageResponse.arrayBuffer()), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    assert.equal((await fetch(`${preview.url}/private.txt`)).status, 404);
    assert.equal((await fetch(`${preview.url}/private`)).status, 404);

    const dashboardResponse = await fetch(`${preview.url}/dashboard.json`);
    assert.equal(dashboardResponse.headers.get("cache-control"), "no-store");
    const browserDashboard = await dashboardResponse.json();
    assert.deepEqual(
      browserDashboard.dashboard.pages.map(({ id }) => id),
      ["built-in", "package-one"],
    );
    assert.equal(browserDashboard.dashboard.description, "[REDACTED]");
    const sourcesResponse = await fetch(`${preview.url}/sources.json`);
    assert.deepEqual(await sourcesResponse.json(), {
      repositories: {
        rows: [{ token: "[REDACTED]", note: "[REDACTED]" }],
      },
    });

    const traversalResponse = await fetch(`${preview.url}/..%2Foutside.txt`);
    assert.equal(traversalResponse.status, 404);
    assert.equal(await requestWithHost(`${preview.url}/sources.json`, "attacker.example"), 400);
    const unprotectedUrl = new URL(preview.url);
    unprotectedUrl.pathname = "/sources.json";
    assert.equal((await fetch(unprotectedUrl)).status, 404);

    const socket = await openDashboardSocket(preview.url);
    const update = nextDashboard(socket);
    await writeFile(path.join(packageDirectory, "dashboard.json"), dashboard("package-two"));
    assert.deepEqual(
      (await update).dashboard.pages.map(({ id }) => id),
      ["built-in", "package-two"],
    );
    socket.close();

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

test("local dashboard server fails when dashboard data cannot be downloaded", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "dashboard-local-server-"));
  await writeFile(path.join(root, "index.html"), "<!doctype html><body>preview</body>");
  await writeFile(path.join(root, "dashboard.json"), dashboard("built-in"));

  try {
    await assert.rejects(
      startDashboardServer({
        siteRoot: root,
        catalogRoot: null,
        installedDashboardsDirectory: path.join(root, "dashboards"),
        downloadData: async () => {
          throw new Error("artifact unavailable");
        },
        workingDirectory: root,
        port: 0,
      }),
      /artifact unavailable/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("local dashboard server optionally prompts Copilot to update the active view", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "dashboard-local-server-"));
  const packageRoot = path.join(root, "packages");
  const packageDirectory = path.join(packageRoot, "example");
  await mkdir(packageDirectory, { recursive: true });
  await writeFile(path.join(root, "index.html"), "<!doctype html><body><div id=\"root\"></div></body>");
  await writeFile(path.join(root, "dashboard.json"), dashboard("built-in"));
  await writeFile(path.join(packageDirectory, "dashboard.json"), dashboard("package-one"));
  const prompts = [];
  const promptGate = Promise.withResolvers();
  let runtimeClosed = false;
  let runtimeStopped = false;

  const preview = await startDashboardServer({
    siteRoot: root,
    catalogRoot: packageRoot,
    installedDashboardsDirectory: path.join(root, "dashboards"),
    downloadData: async (destination) => {
      await mkdir(destination, { recursive: true });
      await writeFile(path.join(destination, "sources.json"), "{}");
    },
    copilot: true,
    createCopilotRuntime: async () => ({
      prompt: async (payload) => {
        prompts.push(payload);
        payload.onEvent({ type: "assistant-delta", content: "Updating dashboard…" });
        await promptGate.promise;
        if (runtimeStopped) return { aborted: true };
        const source = payload.request === "Produce invalid JSON"
          ? "{ invalid"
          : JSON.stringify(JSON.parse(dashboard("package-one")));
        await writeFile(payload.viewDashboardPath, source);
        return { aborted: false };
      },
      stop: async () => {
        runtimeStopped = true;
        promptGate.resolve();
        return true;
      },
      close: async () => {
        runtimeClosed = true;
      },
    }),
    workingDirectory: root,
    port: 0,
  });
  try {
    const indexResponse = await fetch(`${preview.url}/`);
    assert.equal(new URL(indexResponse.url).searchParams.get("local-preview"), "copilot");
    const index = await indexResponse.text();
    assert.doesNotMatch(index, /Ask Copilot to update this view/);
    assert.doesNotMatch(index, /<script[^>]+src=.*copilot-prompt/);
    assert.doesNotMatch(index, /eval\(/);

    const socket = await openDashboardSocket(preview.url);
    socket.send(JSON.stringify({
      type: "copilot.start",
      view: "package-one",
      request: "Add a failure trend",
    }));
    while (prompts.length === 0) await new Promise((resolve) => setTimeout(resolve, 5));
    const concurrentError = nextSocketMessage(socket, (message) =>
      message.type === "error" && /already running/.test(message.message));
    socket.send(JSON.stringify({
      type: "copilot.start",
      view: "package-one",
      request: "Change the summary",
    }));
    assert.equal((await concurrentError).type, "error");
    const stoppedMessage = nextSocketMessage(socket, (message) => message.type === "stopped");
    socket.send(JSON.stringify({ type: "copilot.stop" }));
    assert.equal((await stoppedMessage).type, "stopped");
    assert.equal(prompts.length, 1);
    assert.equal(prompts[0].view, "package-one");
    assert.equal(prompts[0].request, "Add a failure trend");
    const expectedViewDashboardPath = await realpath(path.join(packageDirectory, "dashboard.json"));
    assert.equal(prompts[0].viewDashboardPath, expectedViewDashboardPath);
    assert.deepEqual(prompts[0].editableDashboardPaths, [
      await realpath(path.join(root, "dashboard.json")),
      expectedViewDashboardPath,
    ]);
    assert.match(prompts[0].bundledDashboardPath, /cao-dashboard-preview-.*dashboard\.json$/);
    assert.equal(
      await readFile(path.join(packageDirectory, "dashboard.json"), "utf8"),
      dashboard("package-one"),
    );

    runtimeStopped = false;
    const invalidJsonError = nextSocketMessage(socket, (message) =>
      message.type === "error" && /could not update/.test(message.message));
    socket.send(JSON.stringify({
      type: "copilot.start",
      view: "package-one",
      request: "Produce invalid JSON",
    }));
    assert.equal((await invalidJsonError).type, "error");
    socket.close();
  } finally {
    await preview.close();
    await rm(root, { recursive: true, force: true });
  }
  assert.equal(runtimeClosed, true);
});

test("local dashboard server rejects non-loopback Copilot hosts", async () => {
  await assert.rejects(
    startDashboardServer({
      copilot: true,
      host: "0.0.0.0",
      downloadData: async () => {
        throw new Error("download should not start");
      },
    }),
    /Copilot mode requires a loopback --host/,
  );
});

test("local dashboard server rejects paths outside its workspace", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "dashboard-local-server-"));
  const workspace = path.join(root, "workspace");
  const siteRoot = path.join(workspace, "site");
  const outside = path.join(root, "outside");
  await mkdir(siteRoot, { recursive: true });
  await mkdir(outside);
  await writeFile(path.join(root, "dashboard.json"), dashboard("built-in"));
  await writeFile(path.join(siteRoot, "dashboard.json"), dashboard("built-in"));
  try {
    await assert.rejects(
      startDashboardServer({
        siteRoot: root,
        catalogRoot: null,
        installedDashboardsDirectory: path.join(workspace, "dashboards"),
        workingDirectory: workspace,
      }),
      /paths must remain within the workspace/,
    );
    await symlink(outside, path.join(workspace, "dashboards"));
    await assert.rejects(
      startDashboardServer({
        siteRoot,
        catalogRoot: null,
        installedDashboardsDirectory: path.join(workspace, "dashboards"),
        workingDirectory: workspace,
      }),
      /paths must remain within the workspace/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("local dashboard CLI runs directly without a permission sandbox relaunch", () => {
  const repositoryRoot = path.resolve(import.meta.dirname, "../..");
  const result = spawnSync(process.execPath, ["dashboard/local-server.mjs", "--help"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /usage: local-server\.mjs/);
});

test("local dashboard server downloads dashboard-build data with GitHub CLI", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "dashboard-local-server-"));
  const ghExecutable = path.join(root, "gh");
  await writeFile(path.join(root, "index.html"), "<!doctype html><body>preview</body>");
  await writeFile(path.join(root, "dashboard.json"), dashboard("built-in"));
  await writeFile(ghExecutable, `#!/bin/sh
if [ "$1" = "api" ]; then
  if [ "$2" = "repos/acme/control" ]; then
    printf 'main\\n'
    exit
  fi
  if [ "$2" = "repos/acme/control/actions/artifacts?name=central-agentic-ops-dashboard-data&per_page=100" ]; then
    printf '42\\n'
    exit
  fi
  if [ "$2" = "repos/acme/control/actions/runs/42" ]; then
    printf 'success\\tmain\\t.github/workflows/dashboard-build.yml\\n'
    exit
  fi
  exit 2
fi
[ "$1" = "run" ] &&
  [ "$2" = "download" ] &&
  [ "$3" = "42" ] &&
  [ "$4" = "--name" ] &&
  [ "$5" = "central-agentic-ops-dashboard-data" ] &&
  [ "$6" = "--dir" ] &&
  [ "$8" = "--repo" ] &&
  [ "$9" = "acme/control" ] || exit 3
mkdir -p "$7"
printf '{"repositories":{"rows":[{"repository":"control"}]}}' > "$7/sources.json"
`);
  await chmod(ghExecutable, 0o755);

  const preview = await startDashboardServer({
    siteRoot: root,
    catalogRoot: null,
    installedDashboardsDirectory: path.join(root, "dashboards"),
    repository: "acme/control",
    ghExecutable,
    workingDirectory: root,
    port: 0,
  });
  try {
    const response = await fetch(`${preview.url}/sources.json`);
    assert.deepEqual(await response.json(), {
      repositories: { rows: [{ repository: "control" }] },
    });
  } finally {
    await preview.close();
    await rm(root, { recursive: true, force: true });
  }
});
