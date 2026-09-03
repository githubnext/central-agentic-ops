#!/usr/bin/env node

import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  copyFile,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { watch } from "node:fs";
import { isIP } from "node:net";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";
import { bundleDashboardFiles } from "./report/bundle-dashboards.mjs";
import { validateDashboardDocument } from "./site/src/validator.js";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const executeFile = promisify(execFile);
const defaultCatalogRoot = basename(resolve(scriptDirectory, "..", "..")) === ".github"
  ? null
  : resolve(scriptDirectory, "..");
const socketEndpoint = "/__dashboard_socket";
const copilotEndpoint = "/__dashboard_copilot";
const dataArtifactName = "central-agentic-ops-dashboard-data";
const dashboardWorkflowPath = ".github/workflows/dashboard.yml";
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".svg", "image/svg+xml"],
]);

async function existingDirectories(paths) {
  const directories = [];
  for (const path of paths) {
    const entry = await stat(path).catch(() => null);
    if (entry?.isDirectory()) directories.push(path);
  }
  return directories;
}

async function dashboardSourceForView(view, dashboardPaths) {
  for (const path of dashboardPaths) {
    try {
      const document = JSON.parse(await readFile(path, "utf8"));
      const matches = document?.dashboard?.pages?.some((page) =>
        [page?.id, page?.title, page?.["navigation-label"]].includes(view));
      if (matches) return path;
    } catch (error) {
      console.log("Unable to inspect dashboard source for Copilot.", {
        path,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return dashboardPaths[0];
}

async function packageDashboardPaths(catalogRoot, installedDashboardsDirectory) {
  const paths = [];
  const installed = await readdir(installedDashboardsDirectory, { withFileTypes: true }).catch((error) => {
    if (error?.code === "ENOENT") return [];
    throw error;
  });
  for (const entry of installed) {
    if (entry.isFile() && entry.name.endsWith(".json")) {
      paths.push(join(installedDashboardsDirectory, entry.name));
    }
  }

  if (catalogRoot) {
    const catalogEntries = await readdir(catalogRoot, { withFileTypes: true }).catch((error) => {
      if (error?.code === "ENOENT") return [];
      throw error;
    });
    for (const entry of catalogEntries) {
      if (!entry.isDirectory()) continue;
      const path = join(catalogRoot, entry.name, "dashboard.json");
      if ((await stat(path).catch(() => null))?.isFile()) paths.push(path);
    }
  }
  return [...new Set(paths)].toSorted();
}

async function downloadDashboardData(destination, repository, ghExecutable) {
  const repositoryPath = repository || "{owner}/{repo}";
  let defaultBranch;
  let runId;
  try {
    const repositoryResult = await executeFile(ghExecutable, [
      "api",
      `repos/${repositoryPath}`,
      "--jq",
      ".default_branch",
    ]);
    defaultBranch = repositoryResult.stdout.trim();
    const result = await executeFile(ghExecutable, [
      "api",
      `repos/${repositoryPath}/actions/artifacts?name=${dataArtifactName}&per_page=100`,
      "--jq",
      "[.artifacts[] | select(.expired == false)] | sort_by(.created_at) | last | .workflow_run.id // empty",
    ]);
    runId = result.stdout.trim();
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      throw new Error("GitHub CLI is required to download dashboard data.");
    }
    throw new Error("Unable to query the dashboard data artifact. Authenticate GitHub CLI with Actions read access.");
  }
  if (!/^[1-9][0-9]*$/.test(runId)) {
    throw new Error(`No current ${dataArtifactName} artifact is available. Run the dashboard action first.`);
  }
  if (!defaultBranch) throw new Error("Unable to determine the repository default branch.");

  let provenance;
  try {
    const result = await executeFile(ghExecutable, [
      "api",
      `repos/${repositoryPath}/actions/runs/${runId}`,
      "--jq",
      "[.conclusion, .head_branch, .path] | @tsv",
    ]);
    provenance = result.stdout.trim().split("\t");
  } catch {
    throw new Error(`Unable to verify ${dataArtifactName} from workflow run ${runId}.`);
  }
  if (provenance[0] !== "success"
      || provenance[1] !== defaultBranch
      || provenance[2] !== dashboardWorkflowPath) {
    throw new Error(`The latest ${dataArtifactName} artifact is not from a successful trusted dashboard workflow run.`);
  }

  const arguments_ = ["run", "download", runId, "--name", dataArtifactName, "--dir", destination];
  if (repository) arguments_.push("--repo", repository);
  try {
    await executeFile(ghExecutable, arguments_);
  } catch {
    throw new Error(`Unable to download ${dataArtifactName} from workflow run ${runId}.`);
  }
}

async function sourceSignature(paths) {
  const entries = await Promise.all(paths.map(async (path) => `${path}\0${await readFile(path, "utf8")}`));
  return entries.join("\n");
}

async function readJsonRequest(request, limit = 16 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new Error("Request body is too large.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function isLoopbackHost(host) {
  const unbracketed = host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
  if (unbracketed === "localhost" || unbracketed === "::1") return true;
  if (isIP(unbracketed) !== 4) return false;
  return unbracketed.split(".")[0] === "127";
}

function dashboardValidation(source) {
  const result = validateDashboardDocument(source);
  return result.ok
    ? { ok: true, errors: [] }
    : { ok: false, errors: result.errors.map(({ code, message, path }) => ({ code, message, path })) };
}

function errorMetadata(error) {
  return {
    name: error instanceof Error ? error.name : typeof error,
    code: error && typeof error === "object" && "code" in error
      ? String(error.code)
      : undefined,
  };
}

async function startCopilotRuntime({ workingDirectory, copilotExecutable }) {
  console.log("Loading Copilot SDK runtime.", { workingDirectory });
  let sdk;
  try {
    sdk = await import("@github/copilot-sdk");
  } catch {
    console.log("Copilot SDK runtime is unavailable. Install @github/copilot-sdk and yaml.");
    throw new Error("Copilot mode requires @github/copilot-sdk and yaml.");
  }
  const { CopilotClient, defineTool, RuntimeConnection } = sdk;
  const client = new CopilotClient({
    connection: RuntimeConnection.forTcp({
      ...(copilotExecutable ? { path: copilotExecutable } : {}),
    }),
    workingDirectory,
    logLevel: "debug",
  });
  try {
    console.log("Starting Copilot headless server.");
    await client.start();
  } catch (error) {
    console.log("Copilot headless server failed to start.", errorMetadata(error));
    await client.stop().catch((stopError) => {
      console.log("Copilot cleanup after startup failure failed.", errorMetadata(stopError));
    });
    throw error;
  }
  console.log("Copilot headless server started.");

  return {
    async prompt({ view, request, bundledDashboardPath, editableDashboardPaths, viewDashboardPath }) {
      console.log("Creating Copilot dashboard session.", {
        view,
        bundledDashboardPath,
        viewDashboardPath,
        editableDashboardPaths,
      });
      const allowedPaths = new Set(editableDashboardPaths);
      const stringParameter = (description) => ({
        type: "string",
        description,
      });
      const tools = [
        defineTool("read_dashboard_source", {
          description: "Read one of the editable original dashboard source files.",
          parameters: {
            type: "object",
            properties: { path: stringParameter("Exact dashboard source path from the request.") },
            required: ["path"],
            additionalProperties: false,
          },
          skipPermission: true,
          defer: "never",
          handler: async ({ path }) => {
            if (!allowedPaths.has(path)) {
              console.log("Denied dashboard source read outside the allowlist.", { path });
              throw new Error("That path is not an editable dashboard source.");
            }
            const source = await readFile(path, "utf8");
            console.log("Read dashboard source for Copilot.", { path, bytes: Buffer.byteLength(source) });
            return source;
          },
        }),
        defineTool("validate_dashboard_source", {
          description: "Validate candidate Dashboard Language YAML or JSON before saving it.",
          parameters: {
            type: "object",
            properties: { source: stringParameter("Complete candidate dashboard source.") },
            required: ["source"],
            additionalProperties: false,
          },
          skipPermission: true,
          defer: "never",
          handler: async ({ source }) => {
            const result = dashboardValidation(source);
            console.log("Validated Copilot dashboard candidate.", {
              ok: result.ok,
              errorCount: result.errors.length,
              bytes: Buffer.byteLength(source),
            });
            return result;
          },
        }),
        defineTool("save_dashboard_source", {
          description: "Validate and save the complete source for the current view's original dashboard file.",
          parameters: {
            type: "object",
            properties: { source: stringParameter("Complete validated dashboard source.") },
            required: ["source"],
            additionalProperties: false,
          },
          skipPermission: true,
          defer: "never",
          handler: async ({ source }) => {
            const result = dashboardValidation(source);
            if (!result.ok) {
              console.log("Rejected invalid Copilot dashboard save.", {
                path: viewDashboardPath,
                errorCount: result.errors.length,
              });
              return result;
            }
            await writeFile(viewDashboardPath, source);
            console.log("Saved validated Copilot dashboard source.", {
              path: viewDashboardPath,
              bytes: Buffer.byteLength(source),
            });
            return { ok: true };
          },
        }),
      ];
      let session;
      try {
        session = await client.createSession({
          workingDirectory,
          availableTools: [
            "builtin:skill",
            "builtin:task_complete",
            "custom:read_dashboard_source",
            "custom:validate_dashboard_source",
            "custom:save_dashboard_source",
          ],
          tools,
          onPermissionRequest: async (permission) => {
            console.log("Denied unexpected Copilot permission request.", { kind: permission.kind });
            return { kind: "reject", feedback: "This session only permits the dashboard editing tools." };
          },
        });
      } catch (error) {
        console.log("Copilot dashboard session creation failed.", errorMetadata(error));
        throw error;
      }
      console.log("Copilot dashboard session created.", { sessionId: session.sessionId, view });
      const unsubscribe = session.on((event) => {
        console.log("Copilot dashboard session event.", { sessionId: session.sessionId, type: event.type });
      });
      try {
        console.log("Sending Copilot dashboard request.", {
          sessionId: session.sessionId,
          view,
          requestLength: request.length,
        });
        try {
          await session.sendAndWait({
            prompt: `Use the /generate-dashboard-ir skill to update the current dashboard view named ${JSON.stringify(view)}.

Apply this request: ${request}

The composed preview dashboard is ${JSON.stringify(bundledDashboardPath)}. It is a generated temporary file and is provided only for context; do not read or edit it.
The original dashboard source most likely defining this view is ${JSON.stringify(viewDashboardPath)}.
The complete set of editable original dashboard sources is:
${editableDashboardPaths.map((path) => `- ${path}`).join("\n")}

Built-in views come from the site's dashboard.json. Package views come from their package dashboard.json source (for an installed control repository, under .github/aw/dashboards; for this catalog, in the matching top-level package directory). Use only read_dashboard_source, validate_dashboard_source, and save_dashboard_source to inspect, validate, and save the original source that defines the named view. Run validate_dashboard_source repeatedly until it passes, then use save_dashboard_source so the local preview reloads. Complete the edit rather than only describing it.`,
          });
        } catch (error) {
          console.log("Copilot dashboard session request failed.", {
            sessionId: session.sessionId,
            view,
            ...errorMetadata(error),
          });
          throw error;
        }
        console.log("Copilot dashboard request completed.", { sessionId: session.sessionId, view });
      } finally {
        unsubscribe();
        console.log("Disconnecting Copilot dashboard session.", { sessionId: session.sessionId });
        await session.disconnect().catch((error) => {
          console.log("Copilot dashboard session disconnect failed.", {
            sessionId: session.sessionId,
            ...errorMetadata(error),
          });
          throw error;
        });
      }
    },
    async close() {
      const errors = await client.stop();
      for (const error of errors) console.log("Copilot shutdown error.", errorMetadata(error));
    },
  };
}

function isWithin(root, candidate) {
  const path = relative(root, candidate);
  return path === "" || (path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path));
}

function websocketTextFrame(content) {
  const payload = Buffer.from(content);
  let header;
  if (payload.length < 126) {
    header = Buffer.from([0x81, payload.length]);
  } else if (payload.length <= 0xffff) {
    header = Buffer.allocUnsafe(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
  } else {
    header = Buffer.allocUnsafe(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(payload.length), 2);
  }
  return Buffer.concat([header, payload]);
}

function websocketCloseFrame() {
  return Buffer.from([0x88, 0x00]);
}

/**
 * Starts the local dashboard server.
 *
 * @param {{
 *   siteRoot?: string,
 *   catalogRoot?: string | null,
 *   installedDashboardsDirectory?: string,
 *   repository?: string,
 *   ghExecutable?: string,
 *   downloadData?: (destination: string, repository?: string, ghExecutable?: string) => Promise<void>,
 *   copilot?: boolean,
 *   copilotExecutable?: string,
 *   createCopilotRuntime?: typeof startCopilotRuntime,
 *   workingDirectory?: string,
 *   host?: string,
 *   port?: number,
 * }} options
 */
export async function startDashboardServer({
  siteRoot = join(scriptDirectory, "site"),
  catalogRoot = defaultCatalogRoot,
  installedDashboardsDirectory = resolve(scriptDirectory, "..", "dashboards"),
  repository,
  ghExecutable = "gh",
  downloadData = downloadDashboardData,
  copilot = false,
  copilotExecutable,
  createCopilotRuntime = startCopilotRuntime,
  workingDirectory = process.cwd(),
  host = "127.0.0.1",
  port = 4173,
} = {}) {
  if (copilot && !isLoopbackHost(host)) {
    console.log("Copilot mode configuration rejected.", {
      reason: "host is not loopback",
      host,
    });
    throw new Error("Copilot mode requires a loopback --host such as 127.0.0.1 or ::1.");
  }
  const resolvedSiteRoot = await realpath(siteRoot);
  const baseDashboardPath = join(resolvedSiteRoot, "dashboard.json");
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "cao-dashboard-preview-"));
  const bundledDashboardPath = join(temporaryDirectory, "dashboard.json");
  const dashboardDataDirectory = join(temporaryDirectory, "data");
  let sourcesContent;
  try {
    await downloadData(dashboardDataDirectory, repository, ghExecutable);
    sourcesContent = await readFile(join(dashboardDataDirectory, "sources.json"), "utf8");
    JSON.parse(sourcesContent);
  } catch (error) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }
  const sockets = new Set();
  const capability = randomBytes(24).toString("hex");
  const routePrefix = `/${capability}`;
  const socketPath = `${routePrefix}${socketEndpoint}`;
  const watchers = new Map();
  let dashboardContent = "";
  let signature = "";
  let refreshTimer;
  let refreshPromise = Promise.resolve();
  let closed = false;
  let copilotRuntime;
  let copilotRequestActive = false;

  const broadcastDashboard = () => {
    console.log("Broadcasting dashboard preview update.", { socketCount: sockets.size });
    const frame = websocketTextFrame(dashboardContent);
    for (const socket of sockets) socket.write(frame);
  };

  const rebuild = async (notify = true) => {
    console.log("Checking dashboard sources for updates.");
    const packagePaths = await packageDashboardPaths(catalogRoot, installedDashboardsDirectory);
    const nextSignature = await sourceSignature([baseDashboardPath, ...packagePaths]);
    if (nextSignature === signature) return packagePaths;

    await copyFile(baseDashboardPath, bundledDashboardPath);
    await bundleDashboardFiles(bundledDashboardPath, packagePaths);
    dashboardContent = await readFile(bundledDashboardPath, "utf8");
    signature = nextSignature;
    console.log("Dashboard preview rebuilt.", {
      bundledDashboardPath,
      editableDashboardPaths: [baseDashboardPath, ...packagePaths],
      notify,
    });
    if (notify) broadcastDashboard();
    return packagePaths;
  };

  const refreshWatchers = async (packagePaths) => {
    if (closed) return;
    const candidates = new Set([
      resolvedSiteRoot,
      installedDashboardsDirectory,
      ...packagePaths.map(dirname),
    ]);
    if (catalogRoot) candidates.add(catalogRoot);
    for (const directory of await existingDirectories(candidates)) {
      if (watchers.has(directory)) continue;
      const watcher = watch(directory, () => scheduleRefresh());
      watcher.on("error", (error) => {
        console.log(`Dashboard watcher failed for ${directory}: ${error.message}`);
        watcher.close();
        watchers.delete(directory);
      });
      watchers.set(directory, watcher);
      console.log("Watching dashboard source directory.", { directory });
    }
  };

  const refresh = async () => {
    if (closed) return;
    try {
      const packagePaths = await rebuild();
      await refreshWatchers(packagePaths);
    } catch (error) {
      console.log(`Dashboard update failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      refreshPromise = refreshPromise.then(refresh, refresh);
    }, 75);
  }

  try {
    const initialPackagePaths = await rebuild(false);
    await refreshWatchers(initialPackagePaths);
    if (copilot) {
      copilotRuntime = await createCopilotRuntime({ workingDirectory, copilotExecutable });
    }
  } catch (error) {
    for (const watcher of watchers.values()) watcher.close();
    await rm(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }

  let expectedAuthority = null;
  const server = createServer(async (request, response) => {
    try {
      if (!expectedAuthority || !request.headers.host || request.headers.host !== expectedAuthority
          || /^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(request.url || "")) {
        response.writeHead(400).end("Bad request\n");
        return;
      }
      const url = new URL(request.url || "/", "http://localhost");
      if (url.pathname !== routePrefix && !url.pathname.startsWith(`${routePrefix}/`)) {
        response.writeHead(404).end("Not found\n");
        return;
      }
      let pathname;
      try {
        pathname = decodeURIComponent(url.pathname.slice(routePrefix.length) || "/");
      } catch {
        response.writeHead(400).end("Bad request\n");
        return;
      }
      if ((pathname === "/" || pathname === "/index.html")
          && !url.searchParams.has("local-preview")) {
        url.searchParams.set("local-preview", copilotRuntime ? "copilot" : "enabled");
        response.writeHead(302, { Location: `${routePrefix}/${url.search}` }).end();
        return;
      }
      if (pathname === copilotEndpoint) {
        if (!copilotRuntime) {
          response.writeHead(404).end("Not found\n");
          return;
        }
        if (request.method !== "POST") {
          response.writeHead(405, { Allow: "POST" }).end();
          return;
        }
        if (request.headers.origin !== `http://${expectedAuthority}`
            || !request.headers["content-type"]?.startsWith("application/json")) {
          console.log("Rejected Copilot request with invalid headers.", {
            hasOrigin: typeof request.headers.origin === "string",
            contentType: request.headers["content-type"] || null,
          });
          response.writeHead(400).end("Bad request\n");
          return;
        }
        if (copilotRequestActive) {
          console.log("Rejected concurrent Copilot dashboard request.");
          response.writeHead(409, { "Content-Type": contentTypes.get(".json") });
          response.end(JSON.stringify({ error: "A Copilot dashboard request is already running." }));
          return;
        }
        copilotRequestActive = true;
        try {
          const payload = await readJsonRequest(request);
          if (typeof payload?.view !== "string" || payload.view.length < 1 || payload.view.length > 200
              || typeof payload?.request !== "string" || payload.request.trim().length < 1
              || payload.request.length > 10000) {
            console.log("Rejected invalid Copilot dashboard request payload.", {
              viewValid: typeof payload?.view === "string"
                && payload.view.length >= 1
                && payload.view.length <= 200,
              requestLength: typeof payload?.request === "string" ? payload.request.length : null,
            });
            response.writeHead(400, { "Content-Type": contentTypes.get(".json") });
            response.end(JSON.stringify({ error: "A valid view and request are required." }));
            return;
          }
          const editableDashboardPaths = [baseDashboardPath, ...await packageDashboardPaths(
            catalogRoot,
            installedDashboardsDirectory,
          )];
          const viewDashboardPath = await dashboardSourceForView(payload.view, editableDashboardPaths);
          console.log("Accepted Copilot dashboard request.", {
            view: payload.view,
            requestLength: payload.request.trim().length,
            viewDashboardPath,
          });
          await copilotRuntime.prompt({
            view: payload.view,
            request: payload.request.trim(),
            bundledDashboardPath,
            editableDashboardPaths,
            viewDashboardPath,
          });
          const savedSource = await readFile(viewDashboardPath, "utf8");
          const validation = dashboardValidation(savedSource);
          if (!validation.ok) {
            console.log("Copilot dashboard request left an invalid source.", {
              view: payload.view,
              viewDashboardPath,
              errorCount: validation.errors.length,
            });
            throw new Error("Copilot produced an invalid dashboard source.");
          }
          console.log("Verified saved Copilot dashboard source.", {
            view: payload.view,
            viewDashboardPath,
          });
          response.writeHead(200, { "Content-Type": contentTypes.get(".json") });
          response.end(JSON.stringify({ ok: true }));
        } catch (error) {
          console.log("Copilot request failed.", errorMetadata(error));
          response.writeHead(500, { "Content-Type": contentTypes.get(".json") });
          response.end(JSON.stringify({ error: "Copilot could not update the view." }));
        } finally {
          copilotRequestActive = false;
        }
        return;
      }
      if (request.method !== "GET" && request.method !== "HEAD") {
        response.writeHead(405, { Allow: "GET, HEAD" }).end();
        return;
      }
      if (pathname === "/") pathname = "/index.html";
      if (pathname === "/sources.json") {
        response.writeHead(200, {
          "Cache-Control": "no-store",
          "Content-Type": contentTypes.get(".json"),
        });
        response.end(request.method === "HEAD" ? undefined : sourcesContent);
        return;
      }
      const candidate = resolve(resolvedSiteRoot, `.${pathname}`);
      if (!isWithin(resolvedSiteRoot, candidate)) {
        response.writeHead(404).end("Not found\n");
        return;
      }

      let filePath = candidate;
      let metadata = await stat(filePath).catch(() => null);
      if (metadata?.isDirectory()) {
        filePath = join(filePath, "index.html");
        metadata = await stat(filePath).catch(() => null);
      }
      if (!metadata?.isFile()) {
        response.writeHead(404).end("Not found\n");
        return;
      }
      const canonicalPath = await realpath(filePath);
      if (!isWithin(resolvedSiteRoot, canonicalPath)) {
        response.writeHead(404).end("Not found\n");
        return;
      }

      let content;
      if (pathname === "/dashboard.json") content = dashboardContent;
      else content = await readFile(canonicalPath);
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": contentTypes.get(extname(canonicalPath)) || "application/octet-stream",
      });
      response.end(request.method === "HEAD" ? undefined : content);
    } catch (error) {
      console.log(`Dashboard request failed: ${error instanceof Error ? error.message : String(error)}`);
      if (!response.headersSent) response.writeHead(500);
      response.end("Internal server error\n");
    }
  });
  server.on("upgrade", (request, socket) => {
    const key = request.headers["sec-websocket-key"];
    if (!expectedAuthority
        || request.headers.host !== expectedAuthority
        || request.url !== socketPath
        || request.headers.upgrade?.toLowerCase() !== "websocket"
        || request.headers["sec-websocket-version"] !== "13"
        || typeof key !== "string"
        || Buffer.from(key, "base64").length !== 16) {
      socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
      return;
    }
    const accept = createHash("sha1")
      .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
      .digest("base64");
    socket.write([
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${accept}`,
      "\r\n",
    ].join("\r\n"));
    sockets.add(socket);
    console.log("Dashboard preview socket connected.", { socketCount: sockets.size });
    let receivedHeaderBytes = 0;
    let removed = false;
    const remove = () => {
      if (removed) return;
      removed = true;
      sockets.delete(socket);
      console.log("Dashboard preview socket disconnected.", { socketCount: sockets.size });
    };
    socket.on("data", (data) => {
      receivedHeaderBytes += Math.min(data.length, 2 - receivedHeaderBytes);
      if (receivedHeaderBytes === 2 && !socket.writableEnded) {
        socket.end(websocketCloseFrame());
      }
    });
    socket.on("close", remove);
    socket.on("error", remove);
    socket.resume();
  });

  try {
    await new Promise((accept, reject) => {
      server.once("error", reject);
      server.listen(port, host, () => {
        const address = server.address();
        if (!address || typeof address === "string") {
          reject(new Error("dashboard server did not bind to a TCP port"));
          return;
        }
        expectedAuthority = `${address.address.includes(":") ? `[${address.address}]` : address.address}:${address.port}`;
        console.log("Dashboard server listening.", { authority: expectedAuthority, copilot });
        accept();
      });
    });
  } catch (error) {
    for (const watcher of watchers.values()) watcher.close();
    await copilotRuntime?.close();
    await rm(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }
  return {
    url: `http://${expectedAuthority}${routePrefix}`,
    async close() {
      if (closed) return;
      closed = true;
      console.log("Stopping dashboard server.");
      clearTimeout(refreshTimer);
      for (const watcher of watchers.values()) watcher.close();
      for (const socket of sockets) socket.end(websocketCloseFrame());
      await new Promise((accept, reject) => server.close((error) => error ? reject(error) : accept()));
      await copilotRuntime?.close();
      await refreshPromise;
      await rm(temporaryDirectory, { recursive: true, force: true });
      console.log("Dashboard server stopped.");
    },
  };
}

function parseArguments(arguments_) {
  const options = {};
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--help") return { help: true };
    if (argument === "--copilot") options.copilot = true;
    else if (argument === "--host") {
      options.host = arguments_[index += 1];
      if (!options.host) throw new Error("--host requires a value");
    }
    else if (argument === "--port") options.port = Number(arguments_[index += 1]);
    else if (argument === "--repo") {
      options.repository = arguments_[index += 1];
      if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(options.repository || "")) {
        throw new Error("--repo must be an OWNER/REPOSITORY name");
      }
    }
    else throw new Error(`unknown argument: ${argument}`);
  }
  if (!options.host) options.host = "127.0.0.1";
  if (!Number.isInteger(options.port ?? 4173) || (options.port ?? 4173) < 1 || (options.port ?? 4173) > 65535) {
    throw new Error("--port must be an integer from 1 through 65535");
  }
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log("usage: local-server.mjs [--copilot] [--repo OWNER/REPOSITORY] [--host HOST] [--port PORT]");
    return;
  }
  const preview = await startDashboardServer(options);
  console.log(`Dashboard preview: ${preview.url}/`);
  const shutdown = () => void preview.close().then(() => process.exit());
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main().catch((error) => {
    console.log(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
