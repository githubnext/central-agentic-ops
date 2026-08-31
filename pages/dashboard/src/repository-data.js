/**
 * Derived repository sources for generic JSON-selected dashboard rendering.
 */

const FAILURE_CONCLUSIONS = new Set(['failure', 'startup-failure', 'timed-out']);

/**
 * @typedef {{
 *   repository: string,
 *   workflows: number,
 *   disabled: number,
 *   reports: number,
 *   evaluatedWorkflowKeys: Set<string>,
 *   runs: number,
 *   failed: number,
 *   actionRequired: number,
 *   aic: number,
 *   repositoryLink?: unknown
 * }} RepositorySummary
 */

/**
 * @param {Record<string, import('./presenter.js').LogicalSourceInput>} sources
 * @returns {Record<string, import('./presenter.js').LogicalSourceInput>}
 */
export function deriveRepositorySources(sources) {
  const runsAvailable = sources.runs?.metadata?.availability !== 'unavailable';
  const summaries = summarizeRepositories(sources);

  return {
    ...sources,
    'repository-summary': {
      source: 'repository-summary',
      rows: buildRepositorySummaryRows(sources),
      metadata: combinedMetadata(sources, ['repositories', 'runs', 'usage'])
    },
    'repository-activity': {
      source: 'repository-activity',
      rows: summaries.map((summary) => ({
        repository: summary.repository,
        workflows: summary.workflows,
        reports: summary.reports,
        'evaluated-workflows': summary.evaluatedWorkflowKeys.size,
        runs: runsAvailable ? summary.runs : null,
        'failure-summary': runsAvailable
          ? summary.runs > 0
            ? `${formatPercent(summary.failed / summary.runs)} · ${formatCount(summary.failed)} failed`
            : '—'
          : 'Unavailable',
        aic: summary.aic,
        status: repositoryStatus(summary),
        ...(summary.repositoryLink ? { 'repository-link': summary.repositoryLink } : {})
      })),
      metadata: combinedMetadata(sources, ['repositories', 'workflows', 'runs', 'outcomes', 'usage', 'operational-values'])
    }
  };
}

/**
 * @param {Record<string, import('./presenter.js').LogicalSourceInput>} sources
 * @returns {Array<Record<string, unknown>>}
 */
function buildRepositorySummaryRows(sources) {
  const repositories = [...new Set((sources.repositories?.rows ?? [])
    .map(qualifiedRepository)
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
  const runs = sources.runs;
  const usage = sources.usage;
  const windowHours = coverageHours(runs?.metadata);
  const runWindow = runs?.metadata?.availability === 'unavailable'
    ? 'Actions run data unavailable'
    : `${titleCase(runs?.metadata?.completeness ?? 'unknown')}${windowHours ? ` ${windowHours}-hour` : ''} Actions run window`;
  const usageCoverage = usage?.metadata?.availability === 'unavailable'
    ? 'Usage data unavailable'
    : `${formatCount(usage?.rows.length ?? 0)} artifacts · ${usage?.metadata?.completeness ?? 'unknown'}`;

  return [
    {
      label: `Repository scope · ${formatCount(repositories.length)} configured`,
      items: repositories.map((repository) => ({
        label: repository,
        'navigation-href': `#page-repository-detail?repository=${encodeURIComponent(repository)}`
      }))
    },
    { label: 'Run window', value: runWindow },
    { label: 'AIC coverage', value: usageCoverage }
  ];
}

/**
 * @param {Record<string, import('./presenter.js').LogicalSourceInput>} sources
 * @returns {RepositorySummary[]}
 */
export function summarizeRepositories(sources) {
  /** @type {Map<string, RepositorySummary>} */
  const summaries = new Map();
  /**
   * @param {Record<string, unknown>} row
   * @returns {RepositorySummary | null}
   */
  const ensure = (row) => {
    const repository = qualifiedRepository(row);
    if (!repository) return null;
    const existing = summaries.get(repository);
    if (existing) {
      if (!existing.repositoryLink && row['repository-link']) existing.repositoryLink = row['repository-link'];
      return existing;
    }
    const summary = {
      repository,
      workflows: 0,
      disabled: 0,
      reports: 0,
      evaluatedWorkflowKeys: new Set(),
      runs: 0,
      failed: 0,
      actionRequired: 0,
      aic: 0,
      ...(row['repository-link'] ? { repositoryLink: row['repository-link'] } : {})
    };
    summaries.set(repository, summary);
    return summary;
  };

  for (const row of sources.repositories?.rows ?? []) ensure(row);
  for (const row of sources.workflows?.rows ?? []) {
    const summary = ensure(row);
    if (!summary) continue;
    summary.workflows += 1;
    if (String(row['workflow-active']) === 'false') summary.disabled += 1;
  }
  for (const row of sources.outcomes?.rows ?? []) {
    const summary = ensure(row);
    if (summary) summary.reports += 1;
  }
  for (const row of sources['operational-values']?.rows ?? []) {
    const summary = ensure(row);
    if (!summary || !Number.isFinite(row['operational-value']) || !row.workflow || !row['evaluator-digest']) continue;
    summary.evaluatedWorkflowKeys.add(String(row.workflow));
  }

  const runs = new Map();
  for (const row of sources.runs?.rows ?? []) {
    const repository = qualifiedRepository(row);
    const run = String(row.run ?? '');
    if (!repository || !run) continue;
    runs.set(`${repository}:${run}`, row);
    ensure(row);
  }
  for (const row of runs.values()) {
    const summary = ensure(row);
    if (!summary) continue;
    summary.runs += 1;
    const conclusion = String(row['run-conclusion'] ?? 'unknown');
    if (FAILURE_CONCLUSIONS.has(conclusion)) summary.failed += 1;
    if (conclusion === 'action-required') summary.actionRequired += 1;
  }
  for (const row of sources.usage?.rows ?? []) {
    const repository = qualifiedRepository(row);
    if (!repository) continue;
    const summary = summaries.get(repository);
    if (summary && Number.isFinite(row.aic)) summary.aic += Number(row.aic);
  }

  return [...summaries.values()].sort((left, right) => (
    right.failed - left.failed
    || right.runs - left.runs
    || left.repository.localeCompare(right.repository)
  ));
}

/** @param {RepositorySummary} summary */
function repositoryStatus(summary) {
  if (summary.failed > 0) return 'Needs attention';
  if (summary.actionRequired > 0) return 'Approval required';
  if (summary.runs > 0) return 'No failures observed';
  if (summary.disabled > 0) return 'Disabled workflows';
  if (summary.reports > 0 || summary.evaluatedWorkflowKeys.size > 0) return 'Outcomes observed';
  return 'No recent activity';
}

/** @param {Record<string, unknown>} row */
function qualifiedRepository(row) {
  const repository = String(row.repository ?? '').trim();
  if (!repository) return '';
  if (repository.includes('/')) return repository;
  const organization = String(row.organization ?? '').trim();
  return organization ? `${organization}/${repository}` : repository;
}

/** @param {number} value */
function formatCount(value) {
  return new Intl.NumberFormat('en').format(value);
}

/** @param {number} value */
function formatPercent(value) {
  return new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 1 }).format(value);
}

/** @param {import('./presenter.js').SourceMetadata | undefined} metadata */
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

/**
 * @param {Record<string, import('./presenter.js').LogicalSourceInput>} sources
 * @param {string[]} sourceNames
 * @returns {import('./presenter.js').SourceMetadata}
 */
function combinedMetadata(sources, sourceNames) {
  const metadata = sourceNames
    .map((name) => sources[name]?.metadata)
    .filter((value) => value !== undefined);
  /** @param {'as-of'|'retrieved-at'} field */
  const latest = (field) => metadata
    .map((value) => value?.[field])
    .filter((value) => typeof value === 'string' && Number.isFinite(Date.parse(value)))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0];
  return {
    'source-id': 'repository-activity-derived',
    'source-kind': 'derived',
    'as-of': latest('as-of') ?? new Date(0).toISOString(),
    'retrieved-at': latest('retrieved-at') ?? new Date(0).toISOString(),
    completeness: metadata.some((value) => value?.completeness === 'partial')
      ? 'partial'
      : metadata.length > 0 && metadata.every((value) => value?.completeness === 'complete')
        ? 'complete'
        : 'unknown',
    freshness: metadata.some((value) => value?.freshness === 'stale')
      ? 'stale'
      : metadata.length > 0 && metadata.every((value) => value?.freshness === 'fresh')
        ? 'fresh'
        : 'unknown',
    availability: sources.repositories?.metadata?.availability ?? 'unavailable'
  };
}
