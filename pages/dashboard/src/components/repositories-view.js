/**
 * CAO-aligned repository scope, usage, and activity views.
 */

import { h } from '../dom.js';

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderRepositoryScope(context) {
  const repositories = repositoryNames(context);
  const runs = context.sources.runs;
  const usage = context.sources.usage;
  const runAvailability = runs?.metadata?.availability;
  const windowHours = coverageHours(runs?.metadata);
  const runWindow = runAvailability === 'unavailable'
    ? 'Actions run data unavailable'
    : `${titleCase(runs?.metadata?.completeness ?? 'unknown')}${windowHours ? ` ${windowHours}-hour` : ''} Actions run window`;
  const coverage = usage?.metadata?.availability === 'unavailable'
    ? 'Usage data unavailable'
    : `${formatCount(usage?.rows.length ?? 0)} artifacts · ${usage?.metadata?.completeness ?? 'unknown'}`;

  return h(
    'dl',
    { className: 'repository-scope-summary', 'aria-label': context.title },
    h(
      'div',
      null,
      h('dt', null, `Repository scope · ${formatCount(repositories.length)} configured`),
      h(
        'dd',
        null,
        ...repositories.flatMap((repository, index) => [
          index > 0 ? ', ' : null,
          h('a', { href: repositoryDetailHref(repository) }, repository)
        ])
      )
    ),
    h('div', null, h('dt', null, 'Run window'), h('dd', null, runWindow)),
    h('div', null, h('dt', null, 'AIC coverage'), h('dd', null, coverage))
  );
}

/** @param {import('./ui-elements.js').ElementRenderContext} context */
function repositoryNames(context) {
  return [...new Set((context.sources.repositories?.rows ?? [])
    .map(qualifiedRepository)
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
}

/** @param {Record<string, unknown>} row */
function qualifiedRepository(row) {
  const repository = String(row.repository ?? '').trim();
  if (!repository) return '';
  if (repository.includes('/')) return repository;
  const organization = String(row.organization ?? '').trim();
  return organization ? `${organization}/${repository}` : repository;
}

/** @param {string} repository */
function repositoryDetailHref(repository) {
  return `#page-repository-detail?repository=${encodeURIComponent(repository)}`;
}

/** @param {number} value */
function formatCount(value) {
  return new Intl.NumberFormat('en').format(value);
}

/** @param {import('../presenter.js').SourceMetadata | undefined} metadata */
function coverageHours(metadata) {
  const start = Date.parse(metadata?.['coverage-start'] ?? '');
  const end = Date.parse(metadata?.['coverage-end'] ?? '');
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  const hours = (end - start) / 3_600_000;
  return Number.isInteger(hours) ? hours : null;
}

/** @param {unknown} value */
function titleCase(value) {
  const text = String(value);
  return text.length > 0 ? text[0].toUpperCase() + text.slice(1) : text;
}
