/**
 * CAO-aligned repository scope, usage, and activity views.
 */

import { h } from '../dom.js';
import { renderTableRegion } from './table-region.js';
import { renderSectionHeading } from './ui-primitives.js';

const FAILURE_CONCLUSIONS = new Set(['failure', 'startup-failure', 'timed-out']);

/**
 * @typedef {{
 *   repository: string,
 *   workflows: number,
 *   disabled: number,
 *   reports: number,
 *   evaluatedWorkflowKeys?: Set<string>,
 *   evaluatedWorkflows: number,
 *   runs: number,
 *   failed: number,
 *   actionRequired: number,
 *   aic: number,
 *   runsAvailable: boolean
 * }} RepositorySummary
 */

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

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderRepositoryActivity(context) {
  const summaries = summarizeRepositories(context.sources);
  const headingId = `${context.pageId}-repository-activity-heading`;
  const rows = summaries.map((summary) => h(
    'tr',
    { 'data-repository': summary.repository },
    h('th', { scope: 'row' }, h('a', { href: repositoryDetailHref(summary.repository) }, summary.repository)),
    h('td', null, formatCount(summary.workflows)),
    h('td', null, formatCount(summary.reports)),
    h('td', null, formatCount(summary.evaluatedWorkflows)),
    h('td', null, summary.runsAvailable ? formatCount(summary.runs) : '—'),
    h(
      'td',
      null,
      h(
        'div',
        { className: 'failure-rate' },
        h('strong', null, summary.runsAvailable && summary.runs > 0 ? formatPercent(summary.failed / summary.runs) : '—'),
        h('span', null, summary.runsAvailable ? `${formatCount(summary.failed)} failed` : 'Unavailable')
      )
    ),
    h('td', null, formatAic(summary.aic)),
    h('td', null, renderRepositoryStatus(summary))
  ));

  return h(
    'section',
    { className: 'repository-health', 'aria-labelledby': headingId },
    renderSectionHeading({
      kicker: 'Repository view',
      id: headingId,
      title: context.title,
      description: context.description,
      summary: `${formatCount(summaries.length)} repositories · Search all workflows`,
      headingTag: context.headingTag
    }),
    renderTableRegion({
      tableClassName: 'repository-health-table',
      regionClassName: 'table-region-static',
      emptyMessage: 'No repositories discovered.',
      colSpan: 8,
      headCells: ['Repository', 'Local AWs', 'Reports', 'Evaluated AWs', 'Local runs', 'Failure rate', 'Local AIC', 'Status'],
      bodyRows: rows
    })
  );
}

/**
 * @param {Record<string, import('../presenter.js').LogicalSourceInput>} sources
 */
export function summarizeRepositories(sources) {
  /** @type {Map<string, RepositorySummary>} */
  const summaries = new Map();
  const runsAvailable = sources.runs?.metadata?.availability !== 'unavailable';
  /** @param {string} repository */
  const ensure = (repository) => {
    if (!repository) return null;
    if (!summaries.has(repository)) {
      summaries.set(repository, {
        repository,
        workflows: 0,
        disabled: 0,
        reports: 0,
        evaluatedWorkflowKeys: new Set(),
        evaluatedWorkflows: 0,
        runs: 0,
        failed: 0,
        actionRequired: 0,
        aic: 0,
        runsAvailable
      });
    }
    return summaries.get(repository);
  };

  for (const row of sources.repositories?.rows ?? []) ensure(qualifiedRepository(row));
  for (const row of sources.workflows?.rows ?? []) {
    const summary = ensure(qualifiedRepository(row));
    if (!summary) continue;
    summary.workflows += 1;
    if (String(row['workflow-active']) === 'false') summary.disabled += 1;
  }
  for (const row of sources.outcomes?.rows ?? []) {
    const summary = ensure(qualifiedRepository(row));
    if (summary) summary.reports += 1;
  }
  for (const row of sources['operational-values']?.rows ?? []) {
    const summary = ensure(qualifiedRepository(row));
    if (!summary || !Number.isFinite(row['operational-value']) || !row.workflow || !row['evaluator-digest']) continue;
    summary.evaluatedWorkflowKeys?.add(String(row.workflow));
  }

  const runs = new Map();
  for (const row of sources.runs?.rows ?? []) {
    const repository = qualifiedRepository(row);
    const run = String(row.run ?? '');
    if (!repository || !run) continue;
    runs.set(`${repository}:${run}`, row);
    ensure(repository);
  }
  for (const row of runs.values()) {
    const summary = ensure(qualifiedRepository(row));
    if (!summary) continue;
    summary.runs += 1;
    const conclusion = String(row['run-conclusion'] ?? 'unknown');
    if (FAILURE_CONCLUSIONS.has(conclusion)) summary.failed += 1;
    if (conclusion === 'action-required') summary.actionRequired += 1;
  }
  for (const row of sources.usage?.rows ?? []) {
    const summary = summaries.get(qualifiedRepository(row));
    if (summary && Number.isFinite(row.aic)) summary.aic += Number(row.aic);
  }

  for (const summary of summaries.values()) {
    summary.evaluatedWorkflows = summary.evaluatedWorkflowKeys?.size ?? 0;
    delete summary.evaluatedWorkflowKeys;
  }
  return [...summaries.values()].sort((left, right) => (
    right.failed - left.failed
    || right.runs - left.runs
    || left.repository.localeCompare(right.repository)
  ));
}

/** @param {RepositorySummary} summary */
function renderRepositoryStatus(summary) {
  if (summary.failed > 0) return status('Needs attention', 'danger');
  if (summary.actionRequired > 0) return status('Approval required', 'attention');
  if (summary.runs > 0) return status('No failures observed', 'success');
  if (summary.disabled > 0) return status('Disabled workflows', 'attention');
  if (summary.reports > 0 || summary.evaluatedWorkflows > 0) return status('Outcomes observed', 'success');
  return status('No recent activity', 'muted');
}

/**
 * @param {string} label
 * @param {'danger'|'attention'|'success'|'muted'} tone
 */
function status(label, tone) {
  return h('span', { className: `status status-${tone}` }, label);
}

/** @param {import('./ui-elements.js').ElementRenderContext} context */
function repositoryNames(context) {
  return summarizeRepositories(context.sources).map((summary) => summary.repository).sort((left, right) => left.localeCompare(right));
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

/** @param {number} value */
function formatAic(value) {
  return new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(value);
}

/** @param {number} value */
function formatPercent(value) {
  return new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 1 }).format(value);
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
