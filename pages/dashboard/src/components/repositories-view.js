/**
 * Report-style repository activity composed from repository, workflow, run,
 * outcome, usage, and operational-value sources.
 */

import { h } from '../dom.js';
import { formatNumber } from '../view-formatters.js';
import { findLink } from './link-content.js';
import { isApprovalConclusion, isFailureConclusion } from './run-classification.js';
import { renderChartWidget, renderPieLegend } from './chart-elements.js';
import { renderTableRegion } from './table-region.js';

/**
 * @param {Record<string, import('../presenter.js').LogicalSourceInput>} sources
 * @param {string} [pageId]
 * @returns {HTMLElement}
 */
export function renderRepositoriesView(sources, pageId = 'repositories') {
  const summaries = summarizeRepositories(sources);
  const scope = rowsFor(sources, 'repositories')
    .map((row) => repositoryKey(row))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));

  return h(
    'div',
    { className: 'repositories-view' },
    renderScopeContext(sources, [...new Set(scope)]),
    renderAicDistribution(sources, summaries, `${pageId}-aic-heading`),
    renderRepositoryActivity(sources, summaries, `${pageId}-activity-heading`)
  );
}

/**
 * @param {Record<string, import('../presenter.js').LogicalSourceInput>} sources
 * @param {string[]} repositories
 */
function renderScopeContext(sources, repositories) {
  const runsMetadata = sources.runs?.metadata;
  const usageMetadata = sources.usage?.metadata;
  const usageAvailable = Boolean(sources.usage) && usageMetadata?.availability !== 'unavailable';
  const artifacts = distinctUsageArtifacts(rowsFor(sources, 'usage'));

  return h(
    'section',
    { className: 'repository-scope-context', 'aria-label': 'Dashboard scope' },
    h(
      'div',
      { className: 'repository-scope-boundary' },
      h('span', null, `Repository scope · ${formatNumber(repositories.length)} configured`),
      h(
        'ul',
        { className: 'repository-scope-set' },
        ...repositories.map((repository) => h('li', null, h('code', null, repository)))
      )
    ),
    h(
      'div',
      null,
      h('span', null, 'Run window'),
      h('strong', null, runWindowLabel(runsMetadata))
    ),
    h(
      'div',
      null,
      h('span', null, 'AIC coverage'),
      h(
        'strong',
        null,
        usageAvailable
          ? `${formatNumber(artifacts)} artifacts${usageMetadata?.completeness === 'complete' ? '' : ' · partial'}`
          : 'Unavailable'
      )
    )
  );
}

/**
 * @param {Record<string, import('../presenter.js').LogicalSourceInput>} sources
 * @param {RepositorySummary[]} summaries
 * @param {string} headingId
 */
function renderAicDistribution(sources, summaries, headingId) {
  const usageMetadata = sources.usage?.metadata;
  const available = Boolean(sources.usage) && usageMetadata?.availability !== 'unavailable';
  const entries = summaries
    .filter((summary) => summary.aiCredits > 0)
    .sort((left, right) => right.aiCredits - left.aiCredits || left.repository.localeCompare(right.repository));
  const leading = entries.slice(0, 5);
  const other = entries.slice(5).reduce((total, entry) => total + entry.aiCredits, 0);
  const segments = [
    ...leading.map((entry) => [entry.repository, entry.aiCredits]),
    ...(other > 0 ? [['Other', other]] : [])
  ];
  const total = segments.reduce((sum, [, value]) => sum + Number(value), 0);
  const points = segments.map(([repository, aiCredits]) => ({
    x: String(repository),
    y: Number(aiCredits),
    color: null
  }));
  const links = new Map(leading.flatMap((entry) => {
    const link = repositoryNavigationLink(entry);
    return link ? [[entry.repository, link]] : [];
  }));

  return h(
    'section',
    { className: 'repository-aic-panel', 'aria-labelledby': headingId },
    h(
      'div',
      null,
      h('h3', { id: headingId }, 'AI Credit usage by AW repository'),
      h('p', null, 'Read-only usage reported by AW runs, deduplicated by workflow run.')
    ),
    !available
      ? h('p', { className: 'empty' }, 'AI Credit usage artifacts are unavailable for this reporting window.')
      : total <= 0
        ? h('p', { className: 'empty' }, 'Reported AW runs consumed 0 AI Credits.')
        : h(
          'div',
          { className: 'repository-aic-chart' },
          renderChartWidget('pie', points, [], { entries: /** @type {Array<[string, number]>} */ (segments), total }, 'Total AIC'),
          renderPieLegend(/** @type {Array<[string, number]>} */ (segments), total, links)
        )
  );
}

/**
 * @param {Record<string, import('../presenter.js').LogicalSourceInput>} sources
 * @param {RepositorySummary[]} summaries
 * @param {string} headingId
 */
function renderRepositoryActivity(sources, summaries, headingId) {
  const runsAvailable = Boolean(sources.runs) && sources.runs.metadata?.availability !== 'unavailable';
  const bodyRows = summaries.map((summary) => {
    const failureRate = summary.runs.length > 0 ? summary.failed / summary.runs.length : null;
    return h(
      'tr',
      { dataset: { repository: summary.repository } },
      h('th', { scope: 'row' }, renderRepositoryLink(summary)),
      h('td', null, formatNumber(summary.workflows.size)),
      h('td', null, formatNumber(summary.reports)),
      h('td', null, formatNumber(summary.evaluatedWorkflows.size)),
      h('td', null, runsAvailable ? formatNumber(summary.runs.length) : '—'),
      h(
        'td',
        null,
        h(
          'div',
          { className: 'repository-failure-rate' },
          h('strong', null, runsAvailable && failureRate !== null ? formatPercent(failureRate) : '—'),
          h('span', null, runsAvailable ? `${formatNumber(summary.failed)} failed` : 'Unavailable')
        )
      ),
      h('td', null, sources.usage?.metadata?.availability === 'unavailable' ? '—' : formatNumber(summary.aiCredits)),
      h('td', null, renderRepositoryStatus(summary, runsAvailable))
    );
  });
  const table = renderTableRegion({
    tableClassName: 'repository-activity-table',
    emptyMessage: 'No repositories discovered.',
    colSpan: 8,
    headCells: ['Repository', 'Local AWs', 'Reports', 'Evaluated AWs', 'Local runs', 'Failure rate', 'Local AIC', 'Status'],
    bodyRows
  });
  table.querySelector('.table-scroll')?.setAttribute('aria-labelledby', headingId);

  return h(
    'section',
    { className: 'repository-activity', 'aria-labelledby': headingId },
    h(
      'div',
      { className: 'repository-activity-heading' },
      h(
        'div',
        null,
        h('span', { className: 'scope-kicker' }, 'Repository view'),
        h('h3', { id: headingId }, 'Activity by repository'),
        h('p', null, 'Repository-local execution health and all attributed package or local-workflow outcomes.')
      ),
      h(
        'span',
        null,
        `${formatNumber(summaries.length)} repositories · `,
        h('a', { href: '#page-workflows', dataset: { navPageId: 'workflows' } }, 'Search all workflows')
      )
    ),
    table
  );
}

/**
 * @param {RepositorySummary} summary
 */
function renderRepositoryLink(summary) {
  const link = repositoryNavigationLink(summary);
  if (!link) return summary.repository;
  const internal = link.href.startsWith('#');
  return h('a', {
    href: link.href,
    'aria-label': link.label,
    ...(internal
      ? { dataset: { navPageId: 'repository-detail' } }
      : { target: '_blank', rel: 'noopener noreferrer' })
  }, summary.repository);
}

/**
 * @param {RepositorySummary} summary
 */
function repositoryNavigationLink(summary) {
  return summary.repository.includes('/')
    ? {
      href: `#page-repository-detail?repository=${encodeURIComponent(summary.repository)}`,
      label: `View ${summary.repository}`
    }
    : summary.link;
}

/**
 * @param {RepositorySummary} summary
 * @param {boolean} runsAvailable
 */
function renderRepositoryStatus(summary, runsAvailable) {
  if (runsAvailable && summary.failed > 0) {
    return statusLink('Needs attention', 'status-danger', 'runs');
  }
  if (runsAvailable && summary.approvalRequired > 0) {
    return statusLink('Approval required', 'status-attention', 'runs');
  }
  if (runsAvailable && summary.runs.length > 0) {
    return h('span', { className: 'status status-success' }, 'No failures observed');
  }
  if (summary.disabled > 0) {
    return statusLink('Disabled workflows', 'status-attention', 'workflows');
  }
  if (summary.reports > 0 || summary.evaluatedWorkflows.size > 0) {
    return h('span', { className: 'status status-success' }, 'Outcomes observed');
  }
  return h('span', { className: 'status status-muted' }, 'No recent activity');
}

/**
 * @param {string} label
 * @param {string} className
 * @param {string} pageId
 */
function statusLink(label, className, pageId) {
  return h('a', {
    className: `status ${className}`,
    href: `#page-${pageId}`,
    dataset: { navPageId: pageId }
  }, label);
}

/**
 * @typedef {{
 *   repository: string,
 *   link: { href: string, label: string } | null,
 *   workflows: Set<string>,
 *   disabled: number,
 *   reports: number,
 *   evaluatedWorkflows: Set<string>,
 *   runs: Array<Record<string, unknown>>,
 *   failed: number,
 *   approvalRequired: number,
 *   aiCredits: number
 * }} RepositorySummary
 */

/**
 * @param {Record<string, import('../presenter.js').LogicalSourceInput>} sources
 * @returns {RepositorySummary[]}
 */
function summarizeRepositories(sources) {
  /** @type {Map<string, RepositorySummary>} */
  const summaries = new Map();
  for (const row of rowsFor(sources, 'repositories')) ensureSummary(summaries, row);
  for (const row of rowsFor(sources, 'workflows')) {
    const summary = ensureSummary(summaries, row);
    if (!summary) continue;
    const workflow = String(row.workflow ?? '').trim();
    if (workflow) summary.workflows.add(workflow);
    if (String(row['workflow-active']) === 'false') summary.disabled += 1;
  }
  for (const row of rowsFor(sources, 'outcomes')) {
    const summary = ensureSummary(summaries, row);
    if (summary) summary.reports += 1;
  }
  for (const row of rowsFor(sources, 'operational-values')) {
    const summary = ensureSummary(summaries, row);
    const workflow = String(row.workflow ?? '').trim();
    if (summary && workflow) summary.evaluatedWorkflows.add(workflow);
  }
  const runsByRepository = new Map();
  for (const row of rowsFor(sources, 'runs')) {
    const summary = ensureSummary(summaries, row);
    if (!summary) continue;
    const runKey = scopedRecordKey(row, 'run');
    const repositoryRuns = runsByRepository.get(summary.repository) ?? new Map();
    if (!repositoryRuns.has(runKey)) repositoryRuns.set(runKey, row);
    runsByRepository.set(summary.repository, repositoryRuns);
  }
  for (const summary of summaries.values()) {
    summary.runs = [...(runsByRepository.get(summary.repository)?.values() ?? [])];
    summary.failed = summary.runs.filter((row) => isFailureConclusion(row['run-conclusion'])).length;
    summary.approvalRequired = summary.runs.filter((row) => isApprovalConclusion(row['run-conclusion'])).length;
  }
  for (const row of deduplicateUsageRows(rowsFor(sources, 'usage'))) {
    const summary = ensureSummary(summaries, row);
    const aic = Number(row.aic);
    if (summary && Number.isFinite(aic)) summary.aiCredits += aic;
  }
  return [...summaries.values()]
    .sort((left, right) => right.failed - left.failed || right.runs.length - left.runs.length || left.repository.localeCompare(right.repository));
}

/**
 * @param {Map<string, RepositorySummary>} summaries
 * @param {Record<string, unknown>} row
 * @returns {RepositorySummary | null}
 */
function ensureSummary(summaries, row) {
  const repository = repositoryKey(row);
  if (!repository) return null;
  const existing = summaries.get(repository);
  const link = findLink(row, 'repository-link');
  if (existing) {
    if (!existing.link && link) existing.link = link;
    return existing;
  }
  const summary = {
    repository,
    link,
    workflows: new Set(),
    disabled: 0,
    reports: 0,
    evaluatedWorkflows: new Set(),
    runs: [],
    failed: 0,
    approvalRequired: 0,
    aiCredits: 0
  };
  summaries.set(repository, summary);
  return summary;
}

/**
 * @param {Array<Record<string, unknown>>} rows
 */
function deduplicateUsageRows(rows) {
  const unique = new Map();
  rows.forEach((row, index) => {
    const invocation = String(row.invocation ?? '').trim();
    const key = invocation ? scopedRecordKey(row, 'invocation') : `${scopedRecordKey(row, 'run')}\0${index}`;
    if (!unique.has(key)) unique.set(key, row);
  });
  return [...unique.values()];
}

/**
 * @param {Array<Record<string, unknown>>} rows
 */
function distinctUsageArtifacts(rows) {
  return new Set(rows.map((row, index) => {
    const run = String(row.run ?? '').trim();
    return run ? scopedRecordKey(row, 'run') : scopedRecordKey(row, 'invocation') || String(index);
  })).size;
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} field
 */
function scopedRecordKey(row, field) {
  return `${repositoryKey(row)}\0${String(row[field] ?? '').trim()}`;
}

/**
 * @param {Record<string, unknown>} row
 */
function repositoryKey(row) {
  const repository = String(row.repository ?? '').trim();
  if (!repository) return '';
  if (repository.includes('/')) return repository;
  const organization = String(row.organization ?? '').trim();
  return organization ? `${organization}/${repository}` : repository;
}

/**
 * @param {Record<string, import('../presenter.js').LogicalSourceInput>} sources
 * @param {string} name
 */
function rowsFor(sources, name) {
  return Array.isArray(sources[name]?.rows) ? sources[name].rows : [];
}

/**
 * @param {import('../presenter.js').SourceMetadata | undefined} metadata
 */
function runWindowLabel(metadata) {
  if (!metadata || metadata.availability === 'unavailable') return 'Actions run data unavailable';
  const start = Date.parse(String(metadata['coverage-start'] ?? ''));
  const end = Date.parse(String(metadata['coverage-end'] ?? ''));
  const hours = Number.isFinite(start) && Number.isFinite(end) && end > start
    ? Math.round((end - start) / 3_600_000)
    : 24;
  const state = metadata.completeness === 'complete' ? 'Complete' : 'Partial';
  return `${state} ${formatNumber(hours)}-hour Actions run window`;
}

/**
 * @param {number} value
 */
function formatPercent(value) {
  return new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 1 }).format(value);
}
