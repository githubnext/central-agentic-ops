/**
 * Derived runtime sources for JSON-selected dashboard elements.
 */

import { formatCount, formatCountNoun } from './components/count-formatters.js';
import dispatchTypeClassification from './components/dispatch-type-classification.json' with { type: 'json' };

const FAILURE_CONCLUSIONS = new Set(['failure', 'startup-failure', 'timed-out']);

/** @typedef {Record<string, unknown>} Row */
/** @typedef {{ run: Row, workflow?: Row, packageName: string, duration: number | null }} ExecutionEpisode */
/** @typedef {{ workflows: Map<string, Row>, runs: Row[], runsByWorkflow: Map<string, Row[]>, workerRuns: Row[], attributedWorkerRuns: Row[], unattributedWorkerRuns: Row[], nonRootRuns: Row[], episodes: ExecutionEpisode[], unattributedEpisodes: ExecutionEpisode[] }} ExecutionModel */

/**
 * @param {Record<string, import('./presenter.js').LogicalSourceInput>} sources
 * @returns {Record<string, import('./presenter.js').LogicalSourceInput>}
 */
export function deriveRuntimeSources(sources) {
  const model = buildExecutionModel(sources);
  const signals = [];
  const dispatches = deriveDispatches(model);
  const episodeSummary = deriveEpisodeSummary(model, sources.runs?.metadata);
  const episodes = deriveEpisodes(model);
  const attributionGaps = deriveAttributionGaps(model);

  for (const episode of model.episodes.filter((candidate) => FAILURE_CONCLUSIONS.has(text(candidate.run['run-conclusion'])))) {
    signals.push({
      priority: 0,
      count: 1,
      tone: 'critical',
      icon: 'issue-opened',
      kind: 'Root failure',
      title: `${episode.packageName} root episode failed`,
      detail: `${runTitle(episode.run, episode.workflow)} · ${formatDuration(episode.duration)}`,
      evidence: '1 failed root run',
      action: 'View evidence',
      'navigation-href': packageOrWorkflowHref(episode.workflow, episode.run)
    });
  }

  for (const [workflowKey, runs] of groupRuns(model.nonRootRuns.filter((run) => FAILURE_CONCLUSIONS.has(text(run['run-conclusion']))))) {
    const workflow = model.workflows.get(workflowKey);
    const retained = model.runsByWorkflow.get(workflowKey)?.length ?? runs.length;
    signals.push({
      priority: 0,
      count: runs.length,
      tone: 'critical',
      icon: 'issue-opened',
      kind: 'Run failures',
      title: workflowName(workflow, runs[0]),
      detail: `${formatCount(runs.length)} of ${formatCount(retained)} retained runs failed`,
      evidence: retained > 0 ? formatPercent(runs.length / retained) : 'No denominator',
      action: 'View evidence',
      'navigation-href': workflowHref(workflow, runs[0])
    });
  }

  for (const [workflowKey, runs] of groupRuns(model.runs.filter((run) => text(run['run-conclusion']) === 'action-required'))) {
    const workflow = model.workflows.get(workflowKey);
    const retained = model.runsByWorkflow.get(workflowKey)?.length ?? runs.length;
    signals.push({
      priority: 1,
      count: runs.length,
      tone: 'action',
      icon: 'shield',
      kind: 'Approval gate',
      title: workflowName(workflow, runs[0]),
      detail: `${formatCount(runs.length)} of ${formatCount(retained)} retained runs require approval`,
      evidence: 'Maintainer action',
      action: 'View evidence',
      'navigation-href': workflowHref(workflow, runs[0])
    });
  }

  if (model.unattributedWorkerRuns.length > 0) {
    signals.push({
      priority: 2,
      count: model.unattributedWorkerRuns.length,
      tone: 'informational',
      icon: 'codescan',
      kind: 'Evidence gap',
      title: 'Worker attribution incomplete',
      detail: workerDispatchEvidenceGap(model.unattributedWorkerRuns.length),
      evidence: 'Causality unknown',
      action: 'View evidence',
      'navigation-href': '#page-runtime?section=runtime-worker-attribution-gaps-heading'
    });
  }

  if (model.unattributedEpisodes.length > 0) {
    signals.push({
      priority: 2,
      count: model.unattributedEpisodes.length,
      tone: 'informational',
      icon: 'codescan',
      kind: 'Evidence gap',
      title: 'Episode evidence stops at the root',
      detail: `${formatCountNoun(model.unattributedEpisodes.length, 'root episode has', 'root episodes have')} no correlated worker attempt or output`,
      evidence: 'Outcome unavailable',
      action: 'View evidence',
      'navigation-href': '#page-runtime?section=runtime-observed-root-episodes-heading'
    });
  }

  signals.push({
    priority: 3,
    count: 1,
    tone: 'informational',
    icon: 'pulse',
    kind: 'Evaluation boundary',
    title: 'Statistical anomalies not evaluated',
    detail: 'The current window does not provide a representative historical baseline. Direct evidence remains visible without inferred anomaly labels.',
    evidence: 'Baseline unavailable',
    action: 'Review evidence'
  });

  signals.sort((left, right) => left.priority - right.priority || right.count - left.count || left.title.localeCompare(right.title));
  return {
    ...sources,
    'runtime-signals': {
      source: 'runtime-signals',
      rows: signals.slice(0, 10),
      metadata: combinedMetadata(sources)
    },
    dispatches: {
      source: 'dispatches',
      rows: dispatches,
      metadata: combinedMetadata(sources)
    },
    'runtime-episode-summary': {
      source: 'runtime-episode-summary',
      rows: episodeSummary,
      metadata: combinedMetadata(sources)
    },
    'runtime-episodes': {
      source: 'runtime-episodes',
      rows: episodes,
      metadata: combinedMetadata(sources)
    },
    'runtime-attribution-gaps': {
      source: 'runtime-attribution-gaps',
      rows: attributionGaps,
      metadata: combinedMetadata(sources)
    }
  };
}

/**
 * @param {ExecutionModel} model
 * @param {import('./presenter.js').SourceMetadata | undefined} runsMetadata
 * @returns {Row[]}
 */
function deriveEpisodeSummary(model, runsMetadata) {
  const windowHours = coverageHours(runsMetadata?.['coverage-start'], runsMetadata?.['coverage-end']);
  return [
    { label: 'Root episodes', value: formatCount(model.episodes.length) },
    {
      label: 'Worker attribution',
      value: `${formatCount(model.attributedWorkerRuns.length)} / ${formatCount(model.workerRuns.length)}`
    },
    { label: 'Run window', value: `${runsMetadata?.completeness === 'complete' ? 'Complete' : 'Partial'} ${formatCount(windowHours)}h` },
    { label: 'Repeated coverage', value: 'Unavailable' }
  ];
}

/**
 * @param {ExecutionModel} model
 * @returns {Row[]}
 */
function deriveEpisodes(model) {
  // Exact root-to-worker correlation is not retained, so every episode intentionally reports root-only evidence.
  return model.episodes.slice(0, 12).map((episode) => ({
    run: episode.run.run,
    'run-title': runTitle(episode.run, episode.workflow),
    package: episode.packageName,
    workflow: workflowName(episode.workflow, episode.run),
    'started-at': episode.run['started-at'],
    duration: formatDuration(episode.duration),
    status: text(episode.run['run-conclusion']) || text(episode.run['run-status']) || 'unknown',
    attribution: 'Root only',
    'run-link': episode.run['run-link']
  }));
}

/**
 * @param {ExecutionModel} model
 * @returns {Row[]}
 */
function deriveAttributionGaps(model) {
  return model.unattributedWorkerRuns.slice(0, 20).map((run) => {
    const workflow = model.workflows.get(runKey(run));
    return {
      run: run.run,
      'run-title': runTitle(run, workflow),
      workflow: workflowName(workflow, run),
      status: text(run['run-conclusion']) || text(run['run-status']) || 'unknown',
      evidence: 'No retained root correlation ID',
      'run-link': run['run-link']
    };
  });
}

/**
 * @param {ExecutionModel} model
 * @returns {Row[]}
 */
function deriveDispatches(model) {
  return model.runs
    .filter((run) => text(run.event) === 'workflow_dispatch')
    .flatMap((run) => {
      const workflow = model.workflows.get(runKey(run));
      if (!workflow) return [];
      const packaged = Boolean(text(workflow.package));
      const role = text(workflow['workflow-role']);
      const classification = dispatchTypeClassification.find((rule) => (
        rule.packaged === packaged && (rule.role === role || rule.role === '*')
      ));
      const conclusion = text(run['run-conclusion']);
      const status = conclusion && conclusion !== 'unknown'
        ? conclusion
        : text(run['run-status']) || 'unknown';
      const repository = text(run.repository) || 'Unknown';
      return [{
        'started-at': run['started-at'],
        'dispatch-type': classification?.label ?? 'Standalone workflow',
        'package-name': text(workflow['package-name']) || text(workflow.package) || 'Not packaged',
        'workflow-name': workflowName(workflow, run),
        'run-title': runTitle(run, workflow),
        'runtime-repository': text(run.organization) ? `${text(run.organization)}/${repository}` : repository,
        status,
        organization: run.organization,
        repository: run.repository,
        workflow: run.workflow,
        'run-link': run['run-link'],
        'repository-link': run['repository-link'],
        'workflow-link': workflow['workflow-link'] ?? run['workflow-link']
      }];
    })
    .sort((left, right) => Date.parse(text(right['started-at'])) - Date.parse(text(left['started-at'])));
}

/**
 * @param {Record<string, import('./presenter.js').LogicalSourceInput>} sources
 * @returns {ExecutionModel}
 */
export function buildExecutionModel(sources) {
  const workflowRows = rowsFor(sources, 'workflows');
  const runs = rowsFor(sources, 'runs');
  const workflows = new Map(workflowRows.map((workflow) => [runKey(workflow), workflow]));
  const runsByWorkflow = groupRuns(runs);
  const rootRuns = runs.filter((run) => text(workflows.get(runKey(run))?.['workflow-role']) === 'orchestrator');
  const workerRuns = runs.filter((run) => text(workflows.get(runKey(run))?.['workflow-role']) === 'worker');
  const episodes = rootRuns
    .map((run) => {
      const workflow = workflows.get(runKey(run));
      return {
        run,
        workflow,
        packageName: text(workflow?.['package-name']) || workflowName(workflow, run),
        duration: durationBetween(run['started-at'], run['ended-at'])
      };
    })
    .sort((left, right) => Date.parse(text(right.run['started-at'])) - Date.parse(text(left.run['started-at'])));

  return {
    workflows,
    runs,
    runsByWorkflow,
    workerRuns,
    attributedWorkerRuns: [],
    unattributedWorkerRuns: workerRuns,
    nonRootRuns: runs.filter((run) => text(workflows.get(runKey(run))?.['workflow-role']) !== 'orchestrator'),
    episodes,
    unattributedEpisodes: episodes
  };
}

/** @param {Array<Record<string, unknown>>} rows */
export function groupRuns(rows) {
  /** @type {Map<string, Row[]>} */
  const groups = new Map();
  for (const run of rows) {
    const key = runKey(run);
    const group = groups.get(key) ?? [];
    group.push(run);
    groups.set(key, group);
  }
  return groups;
}

/** @param {Row} run @param {Row | undefined} workflow */
export function runTitle(run, workflow) {
  return text(run['run-title']) || `Run ${text(run.run) || workflowName(workflow, run)}`;
}

/** @param {Row | undefined} workflow @param {Row | undefined} run */
export function workflowName(workflow, run) {
  return text(workflow?.['workflow-name']) || text(run?.workflow) || 'Unknown workflow';
}

/** @param {Row | undefined} workflow @param {Row} run */
export function packageOrWorkflowHref(workflow, run) {
  const packageId = text(workflow?.package);
  return packageId ? `#page-operational-value?package=${encodeURIComponent(packageId)}` : workflowHref(workflow, run);
}

/** @param {Row | undefined} workflow @param {Row} run */
export function workflowHref(workflow, run) {
  const identity = workflow ?? run;
  const repository = text(identity['runtime-repository']) || text(identity.repository);
  const qualifiedRepository = repository.includes('/') ? repository : `${text(identity.organization)}/${repository}`.replace(/^\/|\/$/g, '');
  const workflowPath = text(identity.workflow);
  return qualifiedRepository && workflowPath
    ? `#page-workflow-runtime?workflow=${encodeURIComponent(`${qualifiedRepository}:${workflowPath}`)}`
    : null;
}

/** @param {unknown} start @param {unknown} end */
export function durationBetween(start, end) {
  const duration = Date.parse(text(end)) - Date.parse(text(start));
  return Number.isFinite(duration) && duration >= 0 ? duration : null;
}

/** @param {number | null} duration */
export function formatDuration(duration) {
  if (!Number.isFinite(duration)) return '—';
  const seconds = Math.max(0, Math.round(Number(duration) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/** @param {number} count */
export function workerDispatchEvidenceGap(count) {
  return `${formatCountNoun(count, 'worker dispatch lacks', 'worker dispatches lack')} episode evidence`;
}

/** @param {unknown} start @param {unknown} end */
function coverageHours(start, end) {
  const duration = durationBetween(start, end);
  return duration === null ? 24 : Math.max(1, Math.round(duration / 3_600_000));
}

/** @param {unknown} value */
export function text(value) {
  return value == null ? '' : String(value);
}

/** @param {Row} row */
export function runKey(row) {
  return `${text(row.organization).toLowerCase()}/${text(row.repository).toLowerCase()}:${text(row.workflow)}`;
}

/**
 * @param {Record<string, import('./presenter.js').LogicalSourceInput>} sources
 * @param {string} name
 * @returns {Row[]}
 */
function rowsFor(sources, name) {
  return Array.isArray(sources[name]?.rows) ? sources[name].rows : [];
}

/** @param {number} value */
function formatPercent(value) {
  return new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 1 }).format(value);
}

/**
 * @param {Record<string, import('./presenter.js').LogicalSourceInput>} sources
 * @returns {import('./presenter.js').SourceMetadata}
 */
function combinedMetadata(sources) {
  return sources.runs?.metadata ?? sources.workflows?.metadata ?? {
    'source-id': 'runtime-derived',
    'source-kind': 'derived',
    'as-of': new Date(0).toISOString(),
    'retrieved-at': new Date(0).toISOString(),
    completeness: 'unknown',
    freshness: 'unknown',
    availability: 'unavailable'
  };
}
