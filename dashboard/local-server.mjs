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
import { existsSync, watch } from "node:fs";
import { createRequire } from "node:module";
import { isIP } from "node:net";
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

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const executeFile = promisify(execFile);
const defaultCatalogRoot = basename(resolve(scriptDirectory, "..", "..")) === ".github"
  ? null
  : resolve(scriptDirectory, "..");
const socketEndpoint = "/__dashboard_socket";
const dataArtifactName = "central-agentic-ops-dashboard-data";
const trustedDashboardWorkflowPaths = new Set([
  ".github/workflows/dashboard-build.yml",
  ".github/workflows/dashboard.yml",
]);
const contentTypes = new Map([
  [".avif", "image/avif"],
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
]);
const redactedTextExtensions = new Set([".css", ".html", ".js", ".md", ".mjs", ".svg"]);

async function existingDirectories(paths) {
  const directories = [];
  for (const path of paths) {
    const entry = await stat(path).catch(() => null);
    if (entry?.isDirectory()) directories.push(path);
  }
  return directories;
}

async function canonicalPath(path) {
  const absolutePath = resolve(path);
  try {
    return await realpath(absolutePath);
  } catch (error) {
    if (error?.code !== "ENOENT" || dirname(absolutePath) === absolutePath) throw error;
    return join(await canonicalPath(dirname(absolutePath)), basename(absolutePath));
  }
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
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
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
      || !trustedDashboardWorkflowPaths.has(provenance[2])) {
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

function isLoopbackHost(host) {
  const unbracketed = host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
  if (unbracketed === "localhost" || unbracketed === "::1") return true;
  if (isIP(unbracketed) !== 4) return false;
  return unbracketed.split(".")[0] === "127";
}

function normalizeDashboardJson(source) {
  return JSON.stringify(JSON.parse(source), null, 2);
}

const secretKeyPattern = /(?:^|[-_])(api[-_]?key|authorization|client[-_]?secret|password|private[-_]?key|secret|token)(?:$|[-_])/i;
const secretValuePatterns = [
  /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g,
  /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi,
  /\bAKIA[A-Z0-9]{16}\b/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];

function redactSecretValues(value) {
  return secretValuePatterns.reduce(
    (redacted, pattern) => redacted.replace(pattern, "[REDACTED]"),
    value,
  );
}

function redactJsonSecrets(source) {
  const redact = (value, key = "") => {
    if (secretKeyPattern.test(key)) return "[REDACTED]";
    if (Array.isArray(value)) return value.map((entry) => redact(entry));
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([name, entry]) => [name, redact(entry, name)]));
    }
    if (typeof value !== "string") return value;
    return redactSecretValues(value);
  };
  return JSON.stringify(redact(JSON.parse(source)), null, 2);
}

function browserSafeFileContent(path, content) {
  const extension = extname(path).toLowerCase();
  if (extension === ".json") return redactJsonSecrets(content.toString("utf8"));
  if (redactedTextExtensions.has(extension)) {
    return redactSecretValues(content.toString("utf8"));
  }
  return content;
}

function errorMetadata(error) {
  return {
    name: error instanceof Error ? error.name : typeof error,
    code: error && typeof error === "object" && "code" in error
      ? String(error.code)
      : undefined,
  };
}

function resolveCopilotCliPath() {
  const arch = process.arch;
  const variants = process.platform === "linux" ? ["linux", "linuxmusl"] : [process.platform];
  const req = createRequire(import.meta.url);
  const searchPaths = req.resolve.paths("@github/copilot") ?? [];
  for (const base of searchPaths) {
    for (const variant of variants) {
      const candidate = join(base, "@github", `copilot-${variant}-${arch}`, "index.js");
      if (existsSync(candidate)) return candidate;
    }
  }
  return undefined;
}

async function startCopilotRuntime({ workingDirectory, copilotExecutable }) {
  console.log("Loading Copilot SDK runtime.", { workingDirectory });
  let sdk;
  try {
    sdk = await import("@github/copilot-sdk");
  } catch {
    console.log("Copilot SDK runtime is unavailable. Install @github/copilot-sdk.");
    throw new Error("Copilot mode requires @github/copilot-sdk.");
  }
  const cliPath = copilotExecutable || resolveCopilotCliPath();
  const { CopilotClient, defineTool, RuntimeConnection } = sdk;
  const client = new CopilotClient({
    connection: RuntimeConnection.forTcp({
      ...(cliPath ? { path: cliPath } : {}),
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

  let activeSession = null;
  return {
    async prompt({
      view,
      request,
      bundledDashboardPath,
      editableDashboardPaths,
      viewDashboardPath,
      onEvent = () => {},
      signal,
    }) {
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
            const source = normalizeDashboardJson(await readFile(path, "utf8"));
            console.log("Read normalized dashboard JSON for Copilot.", {
              path,
              bytes: Buffer.byteLength(source),
            });
            return source;
          },
        }),
        defineTool("validate_dashboard_source", {
          description: "Validate candidate Dashboard Language JSON before saving it.",
          parameters: {
            type: "object",
            properties: { source: stringParameter("Complete candidate dashboard source.") },
            required: ["source"],
            additionalProperties: false,
          },
          skipPermission: true,
          defer: "never",
          handler: async ({ source }) => {
            try {
              normalizeDashboardJson(source);
              console.log("Validated Copilot dashboard JSON candidate.", {
                bytes: Buffer.byteLength(source),
              });
              return { ok: true };
            } catch (error) {
              console.log("Rejected invalid Copilot dashboard JSON candidate.", errorMetadata(error));
              return { ok: false, error: "Dashboard source must be valid JSON." };
            }
          },
        }),
        defineTool("save_dashboard_source", {
          description: "Parse, normalize, and save the complete JSON for the current view's original dashboard file.",
          parameters: {
            type: "object",
            properties: { source: stringParameter("Complete validated dashboard source.") },
            required: ["source"],
            additionalProperties: false,
          },
          skipPermission: true,
          defer: "never",
          handler: async ({ source }) => {
            let normalized;
            try {
              normalized = normalizeDashboardJson(source);
            } catch (error) {
              console.log("Rejected invalid Copilot dashboard JSON save.", {
                path: viewDashboardPath,
                ...errorMetadata(error),
              });
              return { ok: false, error: "Dashboard source must be valid JSON." };
            }
            await writeFile(viewDashboardPath, normalized);
            console.log("Saved normalized Copilot dashboard JSON source.", {
              path: viewDashboardPath,
              bytes: Buffer.byteLength(normalized),
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
      let aborted = false;
      let disconnected = false;
      const disconnect = async () => {
        if (disconnected) return;
        disconnected = true;
        console.log("Disconnecting Copilot dashboard session.", { sessionId: session.sessionId });
        await session.disconnect().catch((error) => {
          console.log("Copilot dashboard session disconnect failed.", {
            sessionId: session.sessionId,
            ...errorMetadata(error),
          });
        });
      };
      const sessionHandle = {
        async stop() {
          if (aborted) return;
          aborted = true;
          console.log("Stopping Copilot dashboard session.", { sessionId: session.sessionId });
          await session.abort().catch((error) => {
            console.log("Copilot dashboard session abort failed.", {
              sessionId: session.sessionId,
              ...errorMetadata(error),
            });
          });
          await disconnect();
        },
      };
      activeSession = sessionHandle;
      const stopOnAbort = () => {
        void sessionHandle.stop();
      };
      signal?.addEventListener("abort", stopOnAbort, { once: true });
      const unsubscribe = session.on((event) => {
        console.log("Copilot dashboard session event.", { sessionId: session.sessionId, type: event.type });
        if (event.type === "assistant.message_delta") {
          onEvent({ type: "assistant-delta", content: event.data.deltaContent });
        } else if (event.type === "assistant.message") {
          onEvent({ type: "assistant-message", content: event.data.content });
        } else if (event.type === "tool.execution_start") {
          onEvent({ type: "status", message: `Running ${event.data.toolName}…` });
        } else if (event.type === "tool.execution_complete") {
          onEvent({
            type: "status",
            message: event.data.success ? "Applying dashboard update…" : "A dashboard tool failed.",
          });
        } else if (event.type === "session.error") {
          onEvent({ type: "error", message: event.data.message });
        } else if (event.type === "session.idle" && event.data.aborted) {
          aborted = true;
        }
      });
      try {
        if (signal?.aborted) {
          await sessionHandle.stop();
          return { aborted: true };
        }
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

Built-in views come from the site's dashboard.json. Package views come from their package dashboard.json source (for an installed control repository, under .github/aw/dashboards; for this catalog, in the matching top-level package directory). Only JSON is supported. Use only read_dashboard_source, validate_dashboard_source, and save_dashboard_source to inspect, validate, and save the original source that defines the named view. Run validate_dashboard_source repeatedly until it passes, then use save_dashboard_source so the JSON is normalized with two-space indentation and the local preview reloads. Complete the edit rather than only describing it.`,
          });
        } catch (error) {
          if (aborted) return { aborted: true };
          console.log("Copilot dashboard session request failed.", {
            sessionId: session.sessionId,
            view,
            ...errorMetadata(error),
          });
          throw error;
        }
        console.log("Copilot dashboard request completed.", { sessionId: session.sessionId, view });
        return { aborted };
      } finally {
        signal?.removeEventListener("abort", stopOnAbort);
        unsubscribe();
        if (activeSession === sessionHandle) activeSession = null;
        await disconnect();
      }
    },
    async stop() {
      if (!activeSession) return false;
      await activeSession.stop();
      return true;
    },
    async close() {
      await activeSession?.stop();
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

function websocketPongFrame(content) {
  const header = Buffer.from([0x8a, content.length]);
  return Buffer.concat([header, content]);
}

function readWebsocketFrames(buffer) {
  const messages = [];
  let offset = 0;
  while (buffer.length - offset >= 2) {
    const first = buffer[offset];
    const second = buffer[offset + 1];
    const final = (first & 0x80) !== 0;
    const opcode = first & 0x0f;
    const masked = (second & 0x80) !== 0;
    let length = second & 0x7f;
    let headerLength = 2;
    if (length === 126) {
      if (buffer.length - offset < 4) break;
      length = buffer.readUInt16BE(offset + 2);
      headerLength = 4;
    } else if (length === 127) {
      if (buffer.length - offset < 10) break;
      const extendedLength = buffer.readBigUInt64BE(offset + 2);
      if (extendedLength > 16_384n) throw new Error("WebSocket message is too large.");
      length = Number(extendedLength);
      headerLength = 10;
    }
    if (!masked || !final || length > 16_384) throw new Error("Unsupported WebSocket frame.");
    if (buffer.length - offset < headerLength + 4 + length) break;
    const maskOffset = offset + headerLength;
    const payloadOffset = maskOffset + 4;
    const payload = Buffer.allocUnsafe(length);
    for (let index = 0; index < length; index += 1) {
      payload[index] = buffer[payloadOffset + index] ^ buffer[maskOffset + (index % 4)];
    }
    messages.push({ opcode, payload });
    offset = payloadOffset + length;
  }
  return { messages, remaining: buffer.subarray(offset) };
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
  const resolvedWorkingDirectory = await realpath(workingDirectory);
  const resolvedSiteRoot = await realpath(siteRoot);
  const resolvedCatalogRoot = catalogRoot ? await canonicalPath(catalogRoot) : null;
  const resolvedInstalledDashboardsDirectory = await canonicalPath(installedDashboardsDirectory);
  if (!isWithin(resolvedWorkingDirectory, resolvedSiteRoot)
      || (resolvedCatalogRoot && !isWithin(resolvedWorkingDirectory, resolvedCatalogRoot))
      || !isWithin(resolvedWorkingDirectory, resolvedInstalledDashboardsDirectory)) {
    console.log("Dashboard server configuration rejected.", {
      reason: "dashboard path is outside the workspace",
    });
    throw new Error("Dashboard server paths must remain within the workspace.");
  }
  const baseDashboardPath = join(resolvedSiteRoot, "dashboard.json");
  const temporaryDirectory = await mkdtemp(join(resolvedWorkingDirectory, ".cao-dashboard-preview-"));
  const bundledDashboardPath = join(temporaryDirectory, "dashboard.json");
  const dashboardDataDirectory = join(temporaryDirectory, "data");
  let sourcesContent;
  try {
    await downloadData(dashboardDataDirectory, repository, ghExecutable);
    sourcesContent = redactJsonSecrets(
      await readFile(join(dashboardDataDirectory, "sources.json"), "utf8"),
    );
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
  let copilotRequest = null;

  const broadcastDashboard = () => {
    console.log("Broadcasting dashboard preview update.", { socketCount: sockets.size });
    const frame = websocketTextFrame(dashboardContent);
    for (const socket of sockets) socket.write(frame);
  };

  const sendSocketEvent = (socket, event) => {
    if (!socket.destroyed && !socket.writableEnded) {
      socket.write(websocketTextFrame(JSON.stringify(event)));
    }
  };

  const runCopilotRequest = async (socket, payload) => {
    if (!copilotRuntime) {
      sendSocketEvent(socket, { type: "error", message: "Copilot mode is not available." });
      return;
    }
    if (copilotRequestActive) {
      console.log("Rejected concurrent Copilot dashboard request.");
      sendSocketEvent(socket, {
        type: "error",
        message: "A Copilot dashboard request is already running.",
      });
      return;
    }
    if (typeof payload?.view !== "string" || payload.view.length < 1 || payload.view.length > 200
        || typeof payload?.request !== "string" || payload.request.trim().length < 1
        || payload.request.length > 10000) {
      console.log("Rejected invalid Copilot dashboard request payload.");
      sendSocketEvent(socket, { type: "error", message: "A valid view and request are required." });
      return;
    }

    copilotRequestActive = true;
    const controller = new AbortController();
    copilotRequest = { socket, controller };
    try {
      const editableDashboardPaths = [baseDashboardPath, ...await packageDashboardPaths(
        resolvedCatalogRoot,
        resolvedInstalledDashboardsDirectory,
      )];
      const viewDashboardPath = await dashboardSourceForView(payload.view, editableDashboardPaths);
      console.log("Accepted Copilot dashboard request.", {
        view: payload.view,
        requestLength: payload.request.trim().length,
        viewDashboardPath,
      });
      const onEvent = (event) => sendSocketEvent(socket, event);
      onEvent({
        type: "debug",
        message: "Starting dashboard view update.",
        details: { view: payload.view },
      });
      onEvent({ type: "started" });
      const result = await copilotRuntime.prompt({
        view: payload.view,
        request: payload.request.trim(),
        bundledDashboardPath,
        editableDashboardPaths,
        viewDashboardPath,
        onEvent,
        signal: controller.signal,
      });
      if (result?.aborted) {
        onEvent({
          type: "debug",
          message: "Dashboard view update was stopped.",
          details: { view: payload.view },
        });
        onEvent({ type: "stopped" });
        return;
      }
      onEvent({
        type: "debug",
        message: "Copilot session completed; validating the saved dashboard source.",
        details: { view: payload.view },
      });
      const savedSource = await readFile(viewDashboardPath, "utf8");
      let normalizedSource;
      try {
        normalizedSource = normalizeDashboardJson(savedSource);
      } catch (error) {
        console.log("Copilot dashboard request left invalid JSON.", {
          view: payload.view,
          viewDashboardPath,
          ...errorMetadata(error),
        });
        throw new Error("Copilot produced invalid dashboard JSON.");
      }
      if (savedSource !== normalizedSource) {
        await writeFile(viewDashboardPath, normalizedSource);
        console.log("Normalized saved Copilot dashboard JSON.", {
          view: payload.view,
          viewDashboardPath,
          bytes: Buffer.byteLength(normalizedSource),
        });
      }
      console.log("Verified saved Copilot dashboard JSON.", {
        view: payload.view,
        viewDashboardPath,
      });
      onEvent({
        type: "debug",
        message: "Dashboard view update completed.",
        details: { view: payload.view },
      });
      onEvent({ type: "done" });
    } catch (error) {
      console.log("Copilot request failed.", errorMetadata(error));
      sendSocketEvent(socket, {
        type: "debug",
        message: "Dashboard view update failed.",
        details: { view: payload.view, ...errorMetadata(error) },
      });
      sendSocketEvent(socket, {
        type: "error",
        message: "Copilot could not update the view.",
      });
    } finally {
      copilotRequestActive = false;
      if (copilotRequest?.socket === socket) copilotRequest = null;
    }
  };

  const handleSocketCommand = async (socket, command) => {
    if (command?.type === "copilot.start") {
      await runCopilotRequest(socket, command);
    } else if (command?.type === "copilot.stop") {
      if (socket === copilotRequest?.socket) {
        copilotRequest.controller.abort();
        await copilotRuntime?.stop();
      }
    }
  };

  const rebuild = async (notify = true) => {
    console.log("Checking dashboard sources for updates.");
    const packagePaths = await packageDashboardPaths(
      resolvedCatalogRoot,
      resolvedInstalledDashboardsDirectory,
    );
    const nextSignature = await sourceSignature([baseDashboardPath, ...packagePaths]);
    if (nextSignature === signature) return packagePaths;

    await copyFile(baseDashboardPath, bundledDashboardPath);
    await bundleDashboardFiles(bundledDashboardPath, packagePaths);
    dashboardContent = redactJsonSecrets(await readFile(bundledDashboardPath, "utf8"));
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
      resolvedInstalledDashboardsDirectory,
      ...packagePaths.map(dirname),
    ]);
    if (resolvedCatalogRoot) candidates.add(resolvedCatalogRoot);
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
      copilotRuntime = await createCopilotRuntime({
        workingDirectory: resolvedWorkingDirectory,
        copilotExecutable,
      });
    }
  } catch (error) {
    for (const watcher of watchers.values()) watcher.close();
    await rm(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }

  let expectedAuthority = null;
  let codespaceAuthority = null;
  let localhostAuthority = null;
  const isAllowedHost = (host) =>
      host === expectedAuthority
      || (localhostAuthority && host === localhostAuthority)
      || (codespaceAuthority && host === codespaceAuthority);
  const server = createServer(async (request, response) => {
    try {
      if (!expectedAuthority || !request.headers.host || !isAllowedHost(request.headers.host)
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
        response.writeHead(302, { Location: `${routePrefix}/${url.search}`, "Content-Type": "text/html; charset=utf-8" }).end();
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
      const extension = extname(filePath).toLowerCase();
      if (!contentTypes.has(extension)) {
        console.log("Refused unsupported dashboard file type.", { extension: extension || null });
        response.writeHead(404).end("Not found\n");
        return;
      }
      const canonicalFilePath = await realpath(filePath);
      if (!isWithin(resolvedSiteRoot, canonicalFilePath)) {
        response.writeHead(404).end("Not found\n");
        return;
      }

      let content;
      if (pathname === "/dashboard.json") content = dashboardContent;
      else content = browserSafeFileContent(canonicalFilePath, await readFile(canonicalFilePath));
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": contentTypes.get(extension),
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
        || !isAllowedHost(request.headers.host)
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
    let incoming = Buffer.alloc(0);
    let removed = false;
    const remove = () => {
      if (removed) return;
      removed = true;
      sockets.delete(socket);
      if (socket === copilotRequest?.socket) {
        copilotRequest.controller.abort();
        void copilotRuntime?.stop();
      }
      console.log("Dashboard preview socket disconnected.", { socketCount: sockets.size });
    };
    socket.on("data", (data) => {
      try {
        incoming = Buffer.concat([incoming, data]);
        const parsed = readWebsocketFrames(incoming);
        incoming = parsed.remaining;
        for (const frame of parsed.messages) {
          if (frame.opcode === 0x8) {
            if (!socket.writableEnded) socket.end(websocketCloseFrame());
          } else if (frame.opcode === 0x9) {
            socket.write(websocketPongFrame(frame.payload));
          } else if (frame.opcode === 0x1) {
            const command = JSON.parse(frame.payload.toString("utf8"));
            void handleSocketCommand(socket, command);
          } else {
            throw new Error("Unsupported WebSocket opcode.");
          }
        }
      } catch (error) {
        console.log("Dashboard preview socket command failed.", errorMetadata(error));
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
        if (isLoopbackHost(address.address)) {
          localhostAuthority = `localhost:${address.port}`;
        }
        if (process.env.CODESPACES === "true" && process.env.CODESPACE_NAME
            && process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN) {
          codespaceAuthority = `${process.env.CODESPACE_NAME}-${address.port}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`;
        }
        console.log("Dashboard server listening.", {
          authority: expectedAuthority,
          ...(localhostAuthority ? { localhostAuthority } : {}),
          ...(codespaceAuthority ? { codespaceAuthority } : {}),
          copilot,
        });
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
    ...(codespaceAuthority ? { codespaceUrl: `https://${codespaceAuthority}${routePrefix}` } : {}),
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
  if (preview.codespaceUrl) {
    console.log(`Dashboard preview (Codespace): ${preview.codespaceUrl}/`);
  }
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
