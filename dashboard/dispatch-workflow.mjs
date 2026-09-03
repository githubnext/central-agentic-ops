import { appendFile } from "node:fs/promises";

const pollIntervalMs = 5_000;

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function parseInputs() {
  const inputs = JSON.parse(process.env.DISPATCH_INPUTS || "{}");
  if (!inputs || Array.isArray(inputs) || typeof inputs !== "object") {
    throw new Error("DISPATCH_INPUTS must be a JSON object");
  }
  return inputs;
}

async function api(path, options = {}) {
  const response = await fetch(`${requiredEnvironment("GITHUB_API_URL")}${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${requiredEnvironment("GH_TOKEN")}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers,
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`GitHub API ${response.status} ${response.statusText}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function findDispatchedRun({ owner, repository, workflow, ref, runName, createdAfter, deadline }) {
  const query = new URLSearchParams({
    branch: ref,
    created: `>=${createdAfter}`,
    event: "workflow_dispatch",
    per_page: "20",
  });
  while (Date.now() < deadline) {
    const result = await api(`/repos/${owner}/${repository}/actions/workflows/${encodeURIComponent(workflow)}/runs?${query}`);
    const run = result.workflow_runs.find((candidate) => candidate.display_title === runName);
    if (run) return run;
    await wait(pollIntervalMs);
  }
  throw new Error(`Timed out waiting for dispatched workflow run ${runName}`);
}

async function waitForCompletion({ owner, repository, run, deadline }) {
  let current = run;
  while (Date.now() < deadline) {
    if (current.status === "completed") {
      if (current.conclusion !== "success") {
        throw new Error(`Dispatched workflow ${current.html_url} concluded with ${current.conclusion}`);
      }
      return current;
    }
    await wait(pollIntervalMs);
    current = await api(`/repos/${owner}/${repository}/actions/runs/${current.id}`);
  }
  throw new Error(`Timed out waiting for dispatched workflow ${current.html_url}`);
}

async function main() {
  const [owner, repository] = requiredEnvironment("GITHUB_REPOSITORY").split("/");
  if (!owner || !repository) throw new Error("GITHUB_REPOSITORY must be owner/repository");

  const workflow = requiredEnvironment("DISPATCH_WORKFLOW");
  const ref = requiredEnvironment("DISPATCH_REF");
  const runName = requiredEnvironment("DISPATCH_RUN_NAME");
  const timeoutMinutes = Number(process.env.DISPATCH_TIMEOUT_MINUTES || "120");
  if (!Number.isFinite(timeoutMinutes) || timeoutMinutes <= 0) {
    throw new Error("DISPATCH_TIMEOUT_MINUTES must be a positive number");
  }

  const createdAfter = new Date(Date.now() - pollIntervalMs).toISOString();
  const dispatch = await api(
    `/repos/${owner}/${repository}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`,
    {
      method: "POST",
      body: JSON.stringify({ ref, inputs: parseInputs(), return_run_details: true }),
    },
  );
  const dispatchedRun = dispatch?.workflow_run || dispatch;
  const deadline = Date.now() + timeoutMinutes * 60_000;
  const run = dispatchedRun?.id
    ? dispatchedRun
    : await findDispatchedRun({ owner, repository, workflow, ref, runName, createdAfter, deadline });
  const completedRun = await waitForCompletion({ owner, repository, run, deadline });

  await appendFile(requiredEnvironment("GITHUB_OUTPUT"), [
    `run-id=${completedRun.id}`,
    `run-attempt=${completedRun.run_attempt}`,
    `run-url=${completedRun.html_url}`,
    "",
  ].join("\n"));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});