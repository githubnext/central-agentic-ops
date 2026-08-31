/**
 * Runtime triage and execution-episode elements.
 */

import { h } from '../dom.js';
import { octicon } from '../octicons.js';
import { renderStatusBadge } from './badge.js';
import { formatCount, formatCountNoun } from './count-formatters.js';
import { findLink, renderWorkflowRunLink } from './link-content.js';
import { formatUtcDateTime, renderSectionHeading, renderVitalStat } from './ui-primitives.js';

const FAILURE_CONCLUSIONS = new Set(['failure', 'startup-failure', 'timed-out']);

/** @typedef {Record<string, unknown>} Row */

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 */
export function renderExecutionSignalList(context) {
  const model = executionModel(context);
  const signals = [];

  for (const episode of model.episodes.filter((candidate) => FAILURE_CONCLUSIONS.has(text(candidate.run['run-conclusion'])))) {
    signals.push({
      priority: 0,
      count: 1,
      className: 'signal-critical',
      icon: 'issue-opened',
      kind: 'Root failure',
      title: `${episode.packageName} root episode failed`,
      detail: `${runTitle(episode.run, episode.workflow)} · ${formatDuration(episode.duration)}`,
      evidence: '1 failed root run',
      link: findLink(episode.run, 'run-link')
    });
  }

  for (const [workflowKey, runs] of groupRuns(model.nonRootRuns.filter((run) => FAILURE_CONCLUSIONS.has(text(run['run-conclusion']))))) {
    const workflow = model.workflows.get(workflowKey);
    const retained = model.runsByWorkflow.get(workflowKey)?.length ?? runs.length;
    signals.push({
      priority: 0,
      count: runs.length,
      className: 'signal-critical',
      icon: 'issue-opened',
      kind: 'Run failures',
      title: workflowName(workflow, runs[0]),
      detail: `${formatCount(runs.length)} of ${formatCount(retained)} retained runs failed`,
      evidence: retained > 0 ? formatPercent(runs.length / retained) : 'No denominator',
      link: findLink(runs[0], 'run-link')
    });
  }

  for (const [workflowKey, runs] of groupRuns(model.runs.filter((run) => text(run['run-conclusion']) === 'action-required'))) {
    const workflow = model.workflows.get(workflowKey);
    const retained = model.runsByWorkflow.get(workflowKey)?.length ?? runs.length;
    signals.push({
      priority: 1,
      count: runs.length,
      className: 'signal-action',
      icon: 'shield',
      kind: 'Approval gate',
      title: workflowName(workflow, runs[0]),
      detail: `${formatCount(runs.length)} of ${formatCount(retained)} retained runs require approval`,
      evidence: 'Maintainer action',
      link: findLink(runs[0], 'run-link')
    });
  }

  if (model.unattributedWorkerRuns.length > 0) {
    signals.push({
      priority: 2,
      count: model.unattributedWorkerRuns.length,
      className: 'signal-informational',
      icon: 'codescan',
      kind: 'Evidence gap',
      title: 'Worker attribution incomplete',
      detail: workerDispatchEvidenceGap(model.unattributedWorkerRuns.length),
      evidence: 'Causality unknown',
      href: '#runtime-episode-attribution-gap'
    });
  }

  if (model.unattributedEpisodes.length > 0) {
    signals.push({
      priority: 2,
      count: model.unattributedEpisodes.length,
      className: 'signal-informational',
      icon: 'codescan',
      kind: 'Evidence gap',
      title: 'Episode evidence stops at the root',
      detail: `${formatCountNoun(model.unattributedEpisodes.length, 'root episode has', 'root episodes have')} no correlated worker attempt or output`,
      evidence: 'Outcome unavailable',
      href: '#runtime-execution-episodes'
    });
  }

  signals.sort((left, right) => left.priority - right.priority || right.count - left.count || left.title.localeCompare(right.title));
  const displayedSignals = signals.slice(0, 10);
  return h(
    'section',
    { className: 'workflow-attention', 'aria-labelledby': 'runtime-needs-attention' },
    renderSectionHeading('Runtime triage', 'runtime-needs-attention', context.title, context.description, formatCountNoun(signals.length, 'signal', 'signals')),
    h(
      'div',
      { className: 'anomaly-readiness', role: 'note' },
      h('span', null, octicon('pulse'), h('strong', null, 'Statistical anomalies · not evaluated')),
      h('p', null, 'The current window does not provide a representative historical baseline. Direct evidence remains visible without inferred anomaly labels.')
    ),
    h(
      'ol',
      { className: 'workflow-attention-list' },
      ...(displayedSignals.length > 0 ? displayedSignals.map(renderSignal) : [h(
        'li',
        { className: 'signal-clear' },
        h('span', { className: 'signal-icon' }, octicon('check-circle')),
        h('span', { className: 'signal-copy' }, h('strong', null, 'No direct attention signals'), h('small', null, 'No failures, approval gates, or evidence gaps were observed.'))
      )])
    ),
    signals.length > displayedSignals.length
      ? h('p', { className: 'workflow-attention-note' }, `Showing the 10 highest-priority of ${formatCount(signals.length)} direct signals.`)
      : null,
    h('p', { className: 'workflow-attention-note' }, 'Order: failures, approval gates, then evidence gaps. Counts are not evidence of waste.')
  );
}

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 */
export function renderExecutionEpisodes(context) {
  const model = executionModel(context);
  const runsMetadata = context.sources.runs?.metadata;
  const windowHours = coverageHours(runsMetadata?.['coverage-start'], runsMetadata?.['coverage-end']);
  return h(
    'section',
    { className: 'episode-observatory', id: 'runtime-execution-episodes', 'aria-labelledby': 'runtime-execution-episodes-heading' },
    renderSectionHeading(
      'Observed behavior',
      'runtime-execution-episodes-heading',
      context.title,
      context.description,
      `${runsMetadata?.completeness === 'complete' ? 'Complete' : 'Partial'} ${formatCount(windowHours)}h run window`
    ),
    h(
      'dl',
      { className: 'episode-vitals' },
      renderVitalStat('Root episodes', model.episodes.length, 'observed orchestrator runs'),
      renderVitalStat('Worker attribution', `${formatCount(model.attributedWorkerRuns.length)} / ${formatCount(model.workerRuns.length)}`, 'correlated workflow dispatches'),
      renderVitalStat('Repeated coverage', '—', 'requires exact episode attribution'),
      renderVitalStat('No-action attempts', '—', 'requires correlated attempt output')
    ),
    h('p', { className: 'episode-method-note' }, 'Dispatch manifests are not retained, so attribution is partial by construction. Repeated coverage and no-action work are investigation signals, not proof of waste.'),
    h(
      'div',
      { className: 'episode-list' },
      ...(model.episodes.length > 0
        ? model.episodes.slice(0, 12).map(renderEpisode)
        : [h('p', { className: 'empty' }, 'No orchestrator runs were observed in the current run window.')])
    ),
    h(
      'details',
      { className: 'episode-attribution-gap', id: 'runtime-episode-attribution-gap' },
      h('summary', null, workerDispatchEvidenceGap(model.unattributedWorkerRuns.length)),
      h('p', null, 'These runs have no retained safe output carrying an exact root correlation ID. They remain unattributed rather than being grouped by time or name.'),
      h(
        'ul',
        null,
        ...(model.unattributedWorkerRuns.length > 0
          ? model.unattributedWorkerRuns.slice(0, 20).map((run) => {
            const workflow = model.workflows.get(runKey(run));
            return h(
              'li',
              null,
              renderWorkflowRunLink(run, runTitle(run, workflow), octicon('external-link')),
              h('span', null, `${workflowName(workflow, run)} · ${text(run['run-conclusion']) || text(run['run-status']) || 'unknown'}`)
            );
          })
          : [h('li', null, 'All observed worker dispatches with retained evidence are attributed.')])
      )
    )
  );
}

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 */
function executionModel(context) {
  const workflowRows = rowsFor(context, 'workflows');
  const runs = rowsFor(context, 'runs');
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

  // Current sources retain no correlation IDs, so observed roots and workers remain explicitly unattributed.
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

/**
 * @param {Row[]} rows
 * @returns {Map<string, Row[]>}
 */
function groupRuns(rows) {
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

/**
 * @param {{ className: string, icon: string, kind: string, title: string, detail: string, evidence: string, link?: { href: string, label: string } | null, href?: string }} signal
 * @param {number} index
 */
function renderSignal(signal, index) {
  const content = [
    h('span', { className: 'signal-rank', 'aria-hidden': 'true' }, String(index + 1)),
    h('span', { className: 'signal-icon' }, octicon(signal.icon)),
    h('span', { className: 'signal-copy' }, h('span', null, signal.kind), h('strong', null, signal.title), h('small', null, signal.detail)),
    h('span', { className: 'signal-evidence' }, h('strong', null, signal.evidence), h('small', null, 'View evidence', signal.link ? octicon('external-link') : null))
  ];
  const href = signal.link?.href ?? signal.href;
  return h('li', { className: signal.className, 'data-signal-kind': signal.kind.toLowerCase().replaceAll(' ', '-') }, href
    ? h('a', { href, ...(signal.link ? { target: '_blank', rel: 'noopener noreferrer', 'aria-label': signal.link.label } : {}) }, ...content)
    : h('span', { className: 'workflow-attention-static' }, ...content));
}

/**
 * @param {{ run: Record<string, unknown>, workflow?: Record<string, unknown>, packageName: string, duration: number | null }} episode
 */
function renderEpisode(episode) {
  const result = text(episode.run['run-conclusion']) || text(episode.run['run-status']) || 'unknown';
  return h(
    'article',
    { className: 'episode-record' },
    h(
      'header',
      null,
      h(
        'div',
        null,
        h('span', { className: 'scope-kicker' }, episode.packageName),
        h('h3', null, renderWorkflowRunLink(episode.run, runTitle(episode.run, episode.workflow), octicon('external-link'))),
        h('p', null, h('time', { dateTime: text(episode.run['started-at']) }, formatUtcDateTime(episode.run['started-at'])))
      ),
      renderStatusBadge(result)
    ),
    h(
      'dl',
      { className: 'episode-measures' },
      renderVitalStat('Episode duration', formatDuration(episode.duration)),
      renderVitalStat('Observed targets', '—'),
      renderVitalStat('Attributed workers', '—'),
      renderVitalStat('Output yield', '—'),
      renderVitalStat('Measured AIC', '—')
    ),
    renderEpisodeExecutionMap(episode),
    h('div', { className: 'episode-execution' }, h('strong', null, 'Correlated worker attempts'), h('ul', null, h('li', { className: 'episode-empty' }, 'No worker run is explicitly attributable from retained evidence.'))),
    h('footer', null, h('span', null, 'Evidence · Root only'), h('span', null, 'No-action attempts unavailable'))
  );
}

/**
 * @param {{ run: Row, workflow?: Row, duration: number | null }} episode
 */
function renderEpisodeExecutionMap(episode) {
  const startedAt = Date.parse(text(episode.run['started-at']));
  const endedAt = Date.parse(text(episode.run['ended-at']));
  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt) || endedAt < startedAt) {
    return h(
      'div',
      { className: 'episode-waterfall episode-waterfall-unavailable' },
      h('strong', null, 'Execution shape unavailable'),
      h('span', null, 'Lifecycle timestamps were not retained for this episode.')
    );
  }

  const result = text(episode.run['run-conclusion']) || text(episode.run['run-status']) || 'unknown';
  const duration = endedAt - startedAt;
  return h(
    'div',
    { className: 'episode-waterfall' },
    h(
      'header',
      null,
      h('strong', null, 'Execution shape'),
      h('span', null, `Observed intervals only · ${formatDuration(duration)} total`)
    ),
    h(
      'ol',
      null,
      h(
        'li',
        { dataset: { laneRole: 'root' } },
        h(
          'span',
          { className: 'episode-lane-label' },
          h('strong', null, 'root'),
          h('small', null, workflowName(episode.workflow, episode.run))
        ),
        h(
          'span',
          { className: 'episode-lane-track' },
          h('i', {
            className: episodeStatusClass(result),
            style: '--lane-start:0%;--lane-size:100%',
            title: `root · ${workflowName(episode.workflow, episode.run)} · ${formatDuration(duration)} · ${result.replaceAll('-', ' ')}`
          })
        ),
        h(
          'span',
          { className: 'episode-lane-result' },
          h('strong', null, formatDuration(duration)),
          h('small', null, result.replaceAll('-', ' '))
        )
      )
    ),
    h(
      'footer',
      null,
      h('span', null, 'Episode start'),
      h('span', null, 'Aligned time'),
      h('span', null, 'Episode end')
    )
  );
}

/**
 * @param {string} result
 */
function episodeStatusClass(result) {
  if (FAILURE_CONCLUSIONS.has(result)) return 'status-danger';
  if (result === 'action-required') return 'status-attention';
  if (result === 'success') return 'status-success';
  return 'status-muted';
}

/**
 * @param {Row} run
 * @param {Row | undefined} workflow
 */
function runTitle(run, workflow) {
  return text(run['run-title']) || `Run ${text(run.run) || workflowName(workflow, run)}`;
}

/**
 * @param {Row | undefined} workflow
 * @param {Row | undefined} run
 */
function workflowName(workflow, run) {
  return text(workflow?.['workflow-name']) || text(run?.workflow) || 'Unknown workflow';
}

/**
 * @param {Row} row
 */
function runKey(row) {
  return `${text(row.organization).toLowerCase()}/${text(row.repository).toLowerCase()}:${text(row.workflow)}`;
}

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @param {string} sourceName
 * @returns {Row[]}
 */
function rowsFor(context, sourceName) {
  return Array.isArray(context.sources[sourceName]?.rows) ? context.sources[sourceName].rows : [];
}

/**
 * @param {unknown} start
 * @param {unknown} end
 */
function durationBetween(start, end) {
  const duration = Date.parse(text(end)) - Date.parse(text(start));
  return Number.isFinite(duration) && duration >= 0 ? duration : null;
}

/**
 * @param {unknown} start
 * @param {unknown} end
 */
function coverageHours(start, end) {
  const duration = durationBetween(start, end);
  return duration === null ? 24 : Math.max(1, Math.round(duration / 3_600_000));
}

/**
 * @param {number | null} duration
 */
function formatDuration(duration) {
  if (!Number.isFinite(duration)) return '—';
  const seconds = Math.max(0, Math.round(Number(duration) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/**
 * @param {unknown} value
 */
/**
 * @param {number} value
 */
function formatPercent(value) {
  return new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 1 }).format(value);
}

/**
 * @param {number} count
 */
function workerDispatchEvidenceGap(count) {
  return `${formatCountNoun(count, 'worker dispatch lacks', 'worker dispatches lack')} episode evidence`;
}

/**
 * @param {unknown} value
 */
function text(value) {
  return value == null ? '' : String(value);
}
