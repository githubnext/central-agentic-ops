/**
 * Runtime triage and execution-episode elements.
 */

import { h } from '../dom.js';
import { renderStatusBadge } from './badge.js';
import { formatCount } from './count-formatters.js';
import { formatUtcDateTime, renderSectionHeading, renderVitalStat } from './ui-primitives.js';
import {
  buildExecutionModel,
  durationBetween,
  formatDuration,
  packageOrWorkflowHref,
  runKey,
  runTitle,
  text,
  workerDispatchEvidenceGap,
  workflowHref,
  workflowName
} from '../runtime-data.js';

const FAILURE_CONCLUSIONS = new Set(['failure', 'startup-failure', 'timed-out']);

/** @typedef {Record<string, unknown>} Row */

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 */
export function renderExecutionEpisodes(context) {
  const model = buildExecutionModel(context.sources);
  const runsMetadata = context.sources.runs?.metadata;
  const windowHours = coverageHours(runsMetadata?.['coverage-start'], runsMetadata?.['coverage-end']);
  return h(
    'section',
    { className: 'episode-observatory', id: 'runtime-execution-episodes', 'aria-labelledby': 'runtime-execution-episodes-heading' },
    renderSectionHeading({
      kicker: 'Observed behavior',
      id: 'runtime-execution-episodes-heading',
      title: context.title,
      description: context.description,
      summary: `${runsMetadata?.completeness === 'complete' ? 'Complete' : 'Partial'} ${formatCount(windowHours)}h run window`
    }),
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
              renderInternalLink(workflowHref(workflow, run), runTitle(run, workflow)),
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
        h('h3', null, renderInternalLink(packageOrWorkflowHref(episode.workflow, episode.run), runTitle(episode.run, episode.workflow))),
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
/**
 * @param {string | null} href
 * @param {string} label
 */
function renderInternalLink(href, label) {
  return href ? h('a', { href }, label) : label;
}

/**
 * @param {Row} row
 */
/**
 * @param {unknown} start
 * @param {unknown} end
 */
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
