/**
 * Tiny presenter prototype for built-in and custom dashboard pages.
 */

import { h } from './dom.js';

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
 * @typedef {{ document: import('./validator.js').DashboardDocument, sources: Record<string, LogicalSourceInput> }} PresentationInput
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
 * @param {import('./validator.js').BuiltInPage | import('./validator.js').CustomPage} page
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
 * @param {import('./validator.js').BuiltInPage & { definition?: { views?: Array<unknown>, ['data-state']?: Record<string, boolean> } }} page
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
