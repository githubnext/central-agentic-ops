export const policyMatrix = Object.freeze({
  configuredModes: ["staged", "review", "live"],
  selectedModes: ["staged", "review", "live"],
  manualReviewRepos: ["", "acme/manual-review"],
  rolloutPercents: [10, 100],
  maxReposValues: [1, 10, 1000],
  totalRepositories: 25,
});

export const userFacingScenarios = Object.freeze([
  {
    group: "Scheduled modes",
    name: "Scheduled default staged",
    inputs: { eventName: "schedule", configuredMode: "staged", manualMode: "", manualReviewRepo: "", rolloutPercent: 100, maxRepos: 1 },
    expected: { safeOutputMode: "staged", safeOutputRepo: "", previewOnly: true, effectiveMaxRepos: 1, dispatchAllowed: true },
  },
  {
    group: "Scheduled modes",
    name: "Scheduled staged at 10 percent",
    inputs: { eventName: "schedule", configuredMode: "staged", manualMode: "", manualReviewRepo: "", rolloutPercent: 10, maxRepos: 1000 },
    expected: { safeOutputMode: "staged", safeOutputRepo: "", previewOnly: true, effectiveMaxRepos: 3, dispatchAllowed: true },
  },
  {
    group: "Scheduled modes",
    name: "Scheduled staged ignores review destination",
    inputs: { eventName: "schedule", configuredMode: "staged", manualMode: "", manualReviewRepo: "", rolloutPercent: 100, maxRepos: 10 },
    expected: { safeOutputMode: "staged", safeOutputRepo: "", previewOnly: true, effectiveMaxRepos: 10, dispatchAllowed: true },
  },
  {
    group: "Scheduled modes",
    name: "Scheduled review uses control repository",
    inputs: { eventName: "schedule", configuredMode: "review", manualMode: "", manualReviewRepo: "", rolloutPercent: 100, maxRepos: 10 },
    expected: { safeOutputMode: "review", safeOutputRepo: "acme/control-plane", previewOnly: false, effectiveMaxRepos: 10, dispatchAllowed: true },
  },
  {
    group: "Scheduled modes",
    name: "Scheduled review defaults to control repository",
    inputs: { eventName: "schedule", configuredMode: "review", manualMode: "", manualReviewRepo: "", rolloutPercent: 100, maxRepos: 10 },
    expected: { safeOutputMode: "review", safeOutputRepo: "acme/control-plane", previewOnly: false, effectiveMaxRepos: 10, dispatchAllowed: true },
  },
  {
    group: "Scheduled modes",
    name: "Scheduled review at 10 percent",
    inputs: { eventName: "schedule", configuredMode: "review", manualMode: "", manualReviewRepo: "", rolloutPercent: 10, maxRepos: 1000 },
    expected: { safeOutputMode: "review", safeOutputRepo: "acme/control-plane", previewOnly: false, effectiveMaxRepos: 3, dispatchAllowed: true },
  },
  {
    group: "Scheduled modes",
    name: "Scheduled live at 100 percent",
    inputs: { eventName: "schedule", configuredMode: "live", manualMode: "", manualReviewRepo: "", rolloutPercent: 100, maxRepos: 1000 },
    expected: { safeOutputMode: "live", safeOutputRepo: "", previewOnly: false, effectiveMaxRepos: 25, dispatchAllowed: true },
  },
  {
    group: "Scheduled modes",
    name: "Scheduled live at 10 percent",
    inputs: { eventName: "schedule", configuredMode: "live", manualMode: "", manualReviewRepo: "", rolloutPercent: 10, maxRepos: 1000 },
    expected: { safeOutputMode: "live", safeOutputRepo: "", previewOnly: false, effectiveMaxRepos: 3, dispatchAllowed: true },
  },
  {
    group: "Rollout limits",
    name: "Absolute cap is stricter than 10 percent",
    inputs: { eventName: "schedule", configuredMode: "live", manualMode: "", manualReviewRepo: "", rolloutPercent: 10, maxRepos: 1 },
    expected: { safeOutputMode: "live", safeOutputRepo: "", previewOnly: false, effectiveMaxRepos: 1, dispatchAllowed: true },
  },
  {
    group: "Manual runs",
    name: "Manual staged runs while schedules are configured live",
    inputs: { eventName: "workflow_dispatch", configuredMode: "live", manualMode: "staged", manualReviewRepo: "", rolloutPercent: 100, maxRepos: 1 },
    expected: { safeOutputMode: "staged", safeOutputRepo: "", previewOnly: true, effectiveMaxRepos: 1, dispatchAllowed: true },
  },
  {
    group: "Manual runs",
    name: "Manual review runs while schedules are configured staged",
    inputs: { eventName: "workflow_dispatch", configuredMode: "staged", manualMode: "review", manualReviewRepo: "acme/manual-review", rolloutPercent: 100, maxRepos: 1 },
    expected: { safeOutputMode: "review", safeOutputRepo: "acme/manual-review", previewOnly: false, effectiveMaxRepos: 1, dispatchAllowed: true },
  },
  {
    group: "Review routing",
    name: "Manual review defaults to control repository",
    inputs: { eventName: "workflow_dispatch", configuredMode: "live", manualMode: "review", manualReviewRepo: "", rolloutPercent: 100, maxRepos: 1 },
    expected: { safeOutputMode: "review", safeOutputRepo: "acme/control-plane", previewOnly: false, effectiveMaxRepos: 1, dispatchAllowed: true },
  },
  {
    group: "Review routing",
    name: "Manual review uses control repository while schedules are staged",
    inputs: { eventName: "workflow_dispatch", configuredMode: "staged", manualMode: "review", manualReviewRepo: "", rolloutPercent: 100, maxRepos: 1 },
    expected: { safeOutputMode: "review", safeOutputRepo: "acme/control-plane", previewOnly: false, effectiveMaxRepos: 1, dispatchAllowed: true },
  },
  {
    group: "Review routing",
    name: "Manual destination overrides control repository",
    inputs: { eventName: "workflow_dispatch", configuredMode: "review", manualMode: "review", manualReviewRepo: "acme/manual-review", rolloutPercent: 100, maxRepos: 1 },
    expected: { safeOutputMode: "review", safeOutputRepo: "acme/manual-review", previewOnly: false, effectiveMaxRepos: 1, dispatchAllowed: true },
  },
  {
    group: "Rollout limits",
    name: "Manual live at 10 percent",
    inputs: { eventName: "workflow_dispatch", configuredMode: "staged", manualMode: "live", manualReviewRepo: "", rolloutPercent: 10, maxRepos: 10 },
    expected: { safeOutputMode: "live", safeOutputRepo: "", previewOnly: false, effectiveMaxRepos: 3, dispatchAllowed: true },
  },
  {
    group: "Rollout limits",
    name: "Manual live with absolute cap",
    inputs: { eventName: "workflow_dispatch", configuredMode: "staged", manualMode: "live", manualReviewRepo: "", rolloutPercent: 100, maxRepos: 10 },
    expected: { safeOutputMode: "live", safeOutputRepo: "", previewOnly: false, effectiveMaxRepos: 10, dispatchAllowed: true },
  },
  {
    group: "Manual runs",
    name: "Manual live runs while schedules are configured review",
    inputs: { eventName: "workflow_dispatch", configuredMode: "review", manualMode: "live", manualReviewRepo: "", rolloutPercent: 100, maxRepos: 1000 },
    expected: { safeOutputMode: "live", safeOutputRepo: "", previewOnly: false, effectiveMaxRepos: 25, dispatchAllowed: true },
  },
  {
    group: "Manual runs",
    name: "Manual staged runs while schedules are configured review",
    inputs: { eventName: "workflow_dispatch", configuredMode: "review", manualMode: "staged", manualReviewRepo: "", rolloutPercent: 100, maxRepos: 10 },
    expected: { safeOutputMode: "staged", safeOutputRepo: "", previewOnly: true, effectiveMaxRepos: 10, dispatchAllowed: true },
  },
  {
    group: "Review routing",
    name: "Manual staged ignores manual destination",
    inputs: { eventName: "workflow_dispatch", configuredMode: "live", manualMode: "staged", manualReviewRepo: "acme/manual-review", rolloutPercent: 100, maxRepos: 10 },
    expected: { safeOutputMode: "staged", safeOutputRepo: "", previewOnly: true, effectiveMaxRepos: 10, dispatchAllowed: true },
  },
  {
    group: "Review routing",
    name: "Manual live ignores manual destination",
    inputs: { eventName: "workflow_dispatch", configuredMode: "staged", manualMode: "live", manualReviewRepo: "acme/manual-review", rolloutPercent: 100, maxRepos: 1 },
    expected: { safeOutputMode: "live", safeOutputRepo: "", previewOnly: false, effectiveMaxRepos: 1, dispatchAllowed: true },
  },
  {
    group: "Rollout limits",
    name: "Manual staged at 10 percent with bounded high cap",
    inputs: { eventName: "workflow_dispatch", configuredMode: "live", manualMode: "staged", manualReviewRepo: "", rolloutPercent: 10, maxRepos: 1000 },
    expected: { safeOutputMode: "staged", safeOutputRepo: "", previewOnly: true, effectiveMaxRepos: 3, dispatchAllowed: true },
  },
  {
    group: "Rollout limits",
    name: "Manual review at 10 percent with bounded high cap",
    inputs: { eventName: "workflow_dispatch", configuredMode: "staged", manualMode: "review", manualReviewRepo: "", rolloutPercent: 10, maxRepos: 1000 },
    expected: { safeOutputMode: "review", safeOutputRepo: "acme/control-plane", previewOnly: false, effectiveMaxRepos: 3, dispatchAllowed: true },
  },
  {
    group: "Rollout limits",
    name: "Absolute cap of 1 wins at 100 percent",
    inputs: { eventName: "workflow_dispatch", configuredMode: "staged", manualMode: "live", manualReviewRepo: "", rolloutPercent: 100, maxRepos: 1 },
    expected: { safeOutputMode: "live", safeOutputRepo: "", previewOnly: false, effectiveMaxRepos: 1, dispatchAllowed: true },
  },
  {
    group: "Rollout limits",
    name: "Absolute cap of 10 wins at 100 percent staged",
    inputs: { eventName: "workflow_dispatch", configuredMode: "live", manualMode: "staged", manualReviewRepo: "", rolloutPercent: 100, maxRepos: 10 },
    expected: { safeOutputMode: "staged", safeOutputRepo: "", previewOnly: true, effectiveMaxRepos: 10, dispatchAllowed: true },
  },
]);

function combinations(dimensions) {
  return dimensions.reduce(
    (rows, [name, values]) => rows.flatMap((row) => values.map((value) => ({ ...row, [name]: value }))),
    [{}],
  );
}

export function policyCases() {
  const sharedDimensions = [
    ["configuredMode", policyMatrix.configuredModes],
    ["rolloutPercent", policyMatrix.rolloutPercents],
    ["maxRepos", policyMatrix.maxReposValues],
  ];
  const scheduled = combinations(sharedDimensions).map((values) => ({
    eventName: "schedule",
    manualMode: "",
    manualReviewRepo: "",
    ...values,
  }));
  const manual = combinations([
    ...sharedDimensions,
    ["manualMode", policyMatrix.selectedModes],
    ["manualReviewRepo", policyMatrix.manualReviewRepos],
  ]).map((values) => ({ eventName: "workflow_dispatch", ...values }));

  return [...scheduled, ...manual].map((values, index) => ({
    id: `${values.eventName}-${String(index + 1).padStart(3, "0")}`,
    totalRepositories: policyMatrix.totalRepositories,
    ...values,
  }));
}