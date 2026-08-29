/**
 * Tiny presenter prototype for built-in and custom dashboard pages.
 */

import { h, keyed } from './dom.js';

/**
 * @typedef {{ availability: 'available'|'empty'|'unavailable', completeness: 'complete'|'partial'|'unknown', freshness: 'fresh'|'stale'|'unknown' }} DataState
 */

/**
 * @typedef {{ 'source-id': string, 'source-kind': string, 'as-of': string, 'retrieved-at': string, completeness: DataState['completeness'], freshness: DataState['freshness'], availability?: DataState['availability'] }} SourceMetadata
 */

/**
 * @typedef {{ source: string, rows: Array<Record<string, unknown>>, metadata: SourceMetadata }} LogicalSourceInput
 */

/**
 * @typedef {{ id: string, kind: 'built-in', page: string, title?: string, description?: string, definition?: { views?: Array<unknown>, ['data-state']?: Record<string, boolean> } }} PresentableBuiltInPage
 */

/**
 * @typedef {{ id: string, kind: 'custom', title?: string, description?: string, views: unknown[] }} PresentableCustomPage
 */

/**
 * @typedef {{ languageVersion: string, dashboard: { id: string, title: string, description?: string, defaults?: Record<string, unknown>, pages: Array<PresentableBuiltInPage | PresentableCustomPage> } }} PresentationDocument
 */

/**
 * @typedef {{ document: PresentationDocument, sources: Record<string, LogicalSourceInput> }} PresentationInput
 */

/**
 * @param {PresentationInput} input
 * @returns {HTMLElement}
 */
export function renderDashboard(input) {
  const { document, sources } = input;
  const title = document.dashboard.title;

  return h(
    'main',
    { className: 'dashboard-prototype' },
    h('h1', null, title),
    h(
      'div',
      { className: 'dashboard-pages' },
      document.dashboard.pages.map((page) => renderPage(page, sources))
    )
  );
}

/**
 * @param {PresentableBuiltInPage | PresentableCustomPage} page
 * @param {Record<string, LogicalSourceInput>} sources
 * @returns {HTMLElement}
 */
function renderPage(page, sources) {
  const title = typeof page.title === 'string' && page.title.length > 0
    ? page.title
    : titleCase(page.id);

  if (page.kind === 'built-in') {
    return renderBuiltInPage(page, title, sources);
  }

  return h(
    'section',
    { className: 'dashboard-page', 'data-page-kind': 'custom', 'data-page-id': page.id },
    h('h2', null, title),
    h('p', null, 'Custom page rendering is not implemented in this increment.')
  );
}

/**
 * @param {PresentableBuiltInPage} page
 * @param {string} title
 * @param {Record<string, LogicalSourceInput>} sources
 * @returns {HTMLElement}
 */
function renderBuiltInPage(page, title, sources) {
  const viewDefinitions = Array.isArray(page.definition?.views) ? page.definition.views : [];
  /** @type {Map<string, LogicalSourceInput>} */
  const pageSources = new Map();

  for (const view of viewDefinitions) {
    const sourceName = getViewSource(view);
    if (!sourceName) {
      continue;
    }
    const sourceInput = sources[sourceName];
    if (sourceInput) {
      pageSources.set(sourceName, sourceInput);
    }
  }

  const effectiveState = summarizeDataState(pageSources);
  const provenanceItems = [...pageSources.entries()].map(([sourceName, sourceInput]) => {
    const metadata = sourceInput.metadata;
    return h(
      'li',
      null,
      `${sourceName}: ${metadata['source-id']} (${metadata['source-kind']}) — as of ${metadata['as-of']}`
    );
  });

  const builtInBody = renderBuiltInPageBody(page, pageSources);

  return h(
    'section',
    { className: 'dashboard-page', 'data-page-kind': 'built-in', 'data-page-name': page.page, 'data-page-id': page.id },
    h('h2', null, title),
    h(
      'dl',
      { className: 'data-state-summary' },
      h('dt', null, 'Availability'),
      h('dd', { 'data-state-axis': 'availability' }, effectiveState.availability),
      h('dt', null, 'Completeness'),
      h('dd', { 'data-state-axis': 'completeness' }, effectiveState.completeness),
      h('dt', null, 'Freshness'),
      h('dd', { 'data-state-axis': 'freshness' }, effectiveState.freshness)
    ),
    builtInBody,
    h('h3', null, 'Provenance'),
    h(
      'ul',
      { className: 'provenance-list' },
      provenanceItems.length > 0
        ? provenanceItems
        : [h('li', null, 'No source provenance available for this page.')]
    )
  );
}

/**
 * @param {PresentableBuiltInPage} page
 * @param {Map<string, LogicalSourceInput>} pageSources
 * @returns {HTMLElement}
 */
function renderBuiltInPageBody(page, pageSources) {
  if (page.page === 'runs') {
    return renderRunsPage(pageSources);
  }

  return h('p', { className: 'page-placeholder' }, `Built-in page ${page.page} is not rendered in this increment.`);
}

/**
 * @param {Map<string, LogicalSourceInput>} pageSources
 * @returns {HTMLElement}
 */
function renderRunsPage(pageSources) {
  const runsSource = pageSources.get('runs');
  const outcomeSource = pageSources.get('outcomes');
  const runs = Array.isArray(runsSource?.rows) ? runsSource.rows : [];
  const outcomes = Array.isArray(outcomeSource?.rows) ? outcomeSource.rows : [];

  const statusCounts = countBy(runs, 'run-status');
  const conclusionCounts = countBy(runs, 'run-conclusion');
  const outcomeCounts = countBy(outcomes, 'outcome-state');

  const items = runs.map((run, index) => ({
    key: getRunKey(run, index),
    run,
    outcomeCount: countMatchingOutcomes(outcomes, run)
  }));

  return h(
    'div',
    { className: 'runs-page' },
    h('h3', null, 'Run Status Counts'),
    renderSummaryList('run-status-counts', statusCounts),
    h('h3', null, 'Run Conclusion Counts'),
    renderSummaryList('run-conclusion-counts', conclusionCounts),
    h('h3', null, 'Outcome Counts'),
    renderSummaryList('run-outcome-counts', outcomeCounts),
    h('h3', null, 'Runs'),
    h(
      'table',
      { className: 'runs-table' },
      h(
        'thead',
        null,
        h(
          'tr',
          null,
          h('th', null, 'Run'),
          h('th', null, 'Status'),
          h('th', null, 'Conclusion'),
          h('th', null, 'Organization'),
          h('th', null, 'Repository'),
          h('th', null, 'Workflow'),
          h('th', null, 'Rollout Mode'),
          h('th', null, 'Engine'),
          h('th', null, 'Requested Model'),
          h('th', null, 'Resolved Model'),
          h('th', null, 'Started At'),
          h('th', null, 'Outcome Count'),
          h('th', null, 'Run Link')
        )
      ),
      h(
        'tbody',
        null,
        items.length > 0
          ? keyed(
            items,
            (item) => renderRunRow(/** @type {{ key: string, run: Record<string, unknown>, outcomeCount: number }} */ (item)),
            (item) => /** @type {{ key: string }} */ (item).key
          )
          : h('tr', null, h('td', { colSpan: 13 }, 'No runs available.'))
      )
    )
  );
}

/**
 * @param {{ key: string, run: Record<string, unknown>, outcomeCount: number }} item
 * @returns {HTMLElement}
 */
function renderRunRow(item) {
  const run = item.run;
  const runLink = findRunLink(run);

  return h(
    'tr',
    { 'data-run-id': String(run.run ?? item.key) },
    h('td', null, toText(run.run)),
    h('td', null, toText(run['run-status'])),
    h('td', null, toText(run['run-conclusion'])),
    h('td', null, toText(run.organization)),
    h('td', null, toText(run.repository)),
    h('td', null, toText(run.workflow)),
    h('td', null, toText(run['rollout-mode'])),
    h('td', null, toText(run.engine)),
    h('td', null, toText(run['requested-model'])),
    h('td', null, toText(run['resolved-model'])),
    h('td', null, toText(run['started-at'])),
    h('td', null, String(item.outcomeCount)),
    h(
      'td',
      null,
      runLink
        ? h('a', { href: runLink.href }, runLink.label)
        : 'Unavailable'
    )
  );
}

/**
 * @param {Map<string, LogicalSourceInput>} pageSources
 * @returns {DataState}
 */
function summarizeDataState(pageSources) {
  /** @type {DataState['availability'][]} */
  const availabilities = [];
  /** @type {DataState['completeness'][]} */
  const completenessValues = [];
  /** @type {DataState['freshness'][]} */
  const freshnessValues = [];

  for (const sourceInput of pageSources.values()) {
    const metadata = sourceInput.metadata;
    availabilities.push(metadata.availability ?? inferAvailability(sourceInput.rows));
    completenessValues.push(metadata.completeness);
    freshnessValues.push(metadata.freshness);
  }

  return {
    availability: combineAvailability(availabilities),
    completeness: combineCompleteness(completenessValues),
    freshness: combineFreshness(freshnessValues)
  };
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @returns {DataState['availability']}
 */
function inferAvailability(rows) {
  return rows.length > 0 ? 'available' : 'empty';
}

/**
 * @param {DataState['availability'][]} values
 * @returns {DataState['availability']}
 */
function combineAvailability(values) {
  if (values.includes('unavailable')) {
    return 'unavailable';
  }
  if (values.length === 0 || values.every((value) => value === 'empty')) {
    return 'empty';
  }
  return 'available';
}

/**
 * @param {DataState['completeness'][]} values
 * @returns {DataState['completeness']}
 */
function combineCompleteness(values) {
  if (values.includes('partial')) {
    return 'partial';
  }
  if (values.length === 0 || values.includes('unknown')) {
    return 'unknown';
  }
  return 'complete';
}

/**
 * @param {DataState['freshness'][]} values
 * @returns {DataState['freshness']}
 */
function combineFreshness(values) {
  if (values.includes('stale')) {
    return 'stale';
  }
  if (values.length === 0 || values.includes('unknown')) {
    return 'unknown';
  }
  return 'fresh';
}

/**
 * @param {unknown} view
 * @returns {string | null}
 */
function getViewSource(view) {
  if (!isPlainObject(view) || !isPlainObject(view.data) || typeof view.data.source !== 'string') {
    return null;
  }
  return view.data.source;
}

/**
 * @param {Map<string, number>} counts
 * @param {string} className
 * @returns {HTMLElement}
 */
function renderSummaryList(className, counts) {
  const entries = [...counts.entries()];
  return h(
    'ul',
    { className },
    entries.length > 0
      ? entries.map(([name, count]) => h('li', null, `${name}: ${count}`))
      : [h('li', null, 'No data available.')]
  );
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {string} field
 * @returns {Map<string, number>}
 */
function countBy(rows, field) {
  /** @type {Map<string, number>} */
  const counts = new Map();
  for (const row of rows) {
    const key = toText(row[field]);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * @param {Array<Record<string, unknown>>} outcomes
 * @param {Record<string, unknown>} run
 * @returns {number}
 */
function countMatchingOutcomes(outcomes, run) {
  return outcomes.filter((outcome) => outcome.run === run.run).length;
}

/**
 * @param {Record<string, unknown>} run
 * @param {number} index
 * @returns {string}
 */
function getRunKey(run, index) {
  return typeof run.run === 'string' && run.run.length > 0 ? run.run : `run-${index}`;
}

/**
 * @param {Record<string, unknown>} row
 * @returns {{ href: string, label: string } | null}
 */
function findRunLink(row) {
  const candidate = row['run-link'];
  if (!isPlainObject(candidate) || typeof candidate.href !== 'string' || typeof candidate.label !== 'string') {
    return null;
  }
  return { href: candidate.href, label: candidate.label };
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function toText(value) {
  return value == null || value === '' ? 'unknown' : String(value);
}

/**
 * @param {string} value
 * @returns {string}
 */
function titleCase(value) {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part[0] ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
    .join(' ');
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, any>}
 */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
