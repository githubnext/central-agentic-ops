/**
 * Runtime triage and execution-episode elements.
 */

import { h } from '../dom.js';
import { octicon } from '../octicons.js';
import { renderStatusBadge } from './badge.js';
import { findLink } from './link-content.js';

const FAILURE_CONCLUSIONS = new Set(['failure', 'startup-failure', 'timed-out']);

/** @typedef {Record<string, unknown>} Row */

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 */
export function renderSignalList(context) {
  const model = executionModel(context);
  const signals = [];

  for (const episode of model.episodes.filter((candidate) => FAILURE_CONCLUSIONS.has(text(candidate.run['run-conclusion'])))) {
    signals.push({
      priority: 0,
      count: 1,
      className: 'signal-critical',
      icon: 'issue',
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
      icon: 'issue',
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

  if (model.workerRuns.length > 0) {
    signals.push({
      priority: 2,
      count: model.workerRuns.length,
      className: 'signal-informational',
      icon: 'codescan',
      kind: 'Evidence gap',
      title: 'Worker attribution incomplete',
      detail: `${formatCount(model.workerRuns.length)} observed dispatches lack exact episode evidence`,
      evidence: 'Causality unknown',
      href: '#runtime-episode-attribution-gap'
    });
  }

  if (model.episodes.length > 0) {
    signals.push({
      priority: 2,
      count: model.episodes.length,
      className: 'signal-informational',
      icon: 'codescan',
      kind: 'Evidence gap',
      title: 'Episode evidence stops at the root',
      detail: `${formatCount(model.episodes.length)} root episodes have no correlated worker attempt or output`,
      evidence: 'Outcome unavailable',
      href: '#runtime-execution-episodes'
    });
  }

  signals.sort((left, right) => left.priority - right.priority || right.count - left.count || left.title.localeCompare(right.title));
  const displayedSignals = signals.slice(0, 10);
  return h(
    'section',
    { className: 'workflow-attention', 'aria-labelledby': 'runtime-needs-attention' },
    sectionHeading('Runtime triage', 'runtime-needs-attention', context.title, context.description, `${formatCount(signals.length)} signal${signals.length === 1 ? '' : 's'}`),
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
    sectionHeading(
      'Observed behavior',
      'runtime-execution-episodes-heading',
      context.title,
      context.description,
      `${runsMetadata?.completeness === 'complete' ? 'Complete' : 'Partial'} ${formatCount(windowHours)}h run window`
    ),
    h(
      'dl',
      { className: 'episode-vitals' },
      vital('Root episodes', model.episodes.length, 'observed orchestrator runs'),
      vital('Worker attribution', `0 / ${formatCount(model.workerRuns.length)}`, 'correlated workflow dispatches'),
      vital('Repeated coverage', 0, 'extra package-worker-target attempts'),
      vital('No-action attempts', `0 / 0`, 'correlated attempts with only no-op output')
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
      h('summary', null, `${formatCount(model.workerRuns.length)} worker dispatch${model.workerRuns.length === 1 ? '' : 'es'} lack episode evidence`),
      h('p', null, 'These runs have no retained safe output carrying an exact root correlation ID. They remain unattributed rather than being grouped by time or name.'),
      h(
        'ul',
        null,
        ...(model.workerRuns.length > 0
          ? model.workerRuns.slice(0, 20).map((run) => {
            const workflow = model.workflows.get(runKey(run));
            return h(
              'li',
              null,
              renderRunLink(run, runTitle(run, workflow)),
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
  return {
    workflows,
    runs,
    runsByWorkflow,
    workerRuns,
    nonRootRuns: runs.filter((run) => text(workflows.get(runKey(run))?.['workflow-role']) !== 'orchestrator'),
    episodes: rootRuns
      .map((run) => {
        const workflow = workflows.get(runKey(run));
        return {
          run,
          workflow,
          packageName: text(workflow?.['package-name']) || workflowName(workflow, run),
          duration: durationBetween(run['started-at'], run['ended-at'])
        };
      })
      .sort((left, right) => Date.parse(text(right.run['started-at'])) - Date.parse(text(left.run['started-at'])))
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
        h('h3', null, renderRunLink(episode.run, runTitle(episode.run, episode.workflow))),
        h('p', null, h('time', { dateTime: text(episode.run['started-at']) }, formatDate(episode.run['started-at'])))
      ),
      renderStatusBadge(result)
    ),
    h(
      'dl',
      { className: 'episode-measures' },
      vital('Episode duration', formatDuration(episode.duration)),
      vital('Observed targets', 0),
      vital('Attributed workers', 0),
      vital('Output yield', '0 / 0'),
      vital('Measured AIC', '—')
    ),
    h(
      'div',
      { className: 'episode-waterfall episode-waterfall-unavailable' },
      h('strong', null, 'Execution shape unavailable'),
      h('span', null, 'Exact worker correlation evidence was not retained for this episode.')
    ),
    h('div', { className: 'episode-execution' }, h('strong', null, 'Correlated worker attempts'), h('ul', null, h('li', { className: 'episode-empty' }, 'No worker run is explicitly attributable from retained evidence.'))),
    h('footer', null, h('span', null, 'Evidence · Root only'), h('span', null, '0 no-action attempts'))
  );
}

/**
 * @param {string} kicker
 * @param {string} id
 * @param {string} title
 * @param {string | undefined} description
 * @param {string} summary
 */
function sectionHeading(kicker, id, title, description, summary) {
  return h(
    'div',
    { className: 'section-heading' },
    h('div', null, h('span', { className: 'scope-kicker' }, kicker), h('h3', { id }, title), description ? h('p', null, description) : null),
    h('strong', null, summary)
  );
}

/**
 * @param {string} label
 * @param {unknown} value
 * @param {string} [detail]
 */
function vital(label, value, detail) {
  return h('div', null, h('dt', null, label), h('dd', null, String(value)), detail ? h('p', null, detail) : null);
}

/**
 * @param {Row} run
 * @param {string} label
 */
function renderRunLink(run, label) {
  const link = findLink(run, 'run-link');
  return link
    ? h('a', { href: link.href, target: '_blank', rel: 'noopener noreferrer', 'aria-label': link.label }, label, octicon('external-link'))
    : h('span', null, label);
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
function formatDate(value) {
  const parsed = Date.parse(text(value));
  if (!Number.isFinite(parsed)) return 'Time unavailable';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(parsed));
}

/**
 * @param {unknown} value
 */
function formatCount(value) {
  return new Intl.NumberFormat('en').format(Number(value) || 0);
}

/**
 * @param {number} value
 */
function formatPercent(value) {
  return new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 1 }).format(value);
}

/**
 * @param {unknown} value
 */
function text(value) {
  return value == null ? '' : String(value);
}
