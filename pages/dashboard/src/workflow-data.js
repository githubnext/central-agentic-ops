/**
 * Derived workflow topology sources for generic JSON-selected views.
 */

/** @typedef {Record<string, unknown>} Row */

/**
 * @param {Record<string, import('./presenter.js').LogicalSourceInput>} sources
 * @returns {Record<string, import('./presenter.js').LogicalSourceInput>}
 */
export function deriveWorkflowSources(sources) {
  const workflows = Array.isArray(sources.workflows?.rows) ? sources.workflows.rows : [];
  const outcomes = Array.isArray(sources.outcomes?.rows) ? sources.outcomes.rows : [];
  const packaged = workflows
    .filter((row) => row['workflow-role'] !== 'standalone' && text(row.package))
    .map(derivePackagedWorkflow)
    .sort(comparePackagedWorkflows);
  const standalone = workflows
    .filter((row) => row['workflow-role'] === 'standalone')
    .map(deriveStandaloneWorkflow)
    .sort(compareStandaloneWorkflows);
  const packages = new Set(packaged.map((row) => text(row.package)));
  const metadata = sources.workflows?.metadata ?? unavailableMetadata();

  return {
    ...sources,
    'workflow-topology-summary': {
      source: 'workflow-topology-summary',
      rows: [
        { label: 'Packages', value: String(packages.size) },
        { label: 'Package workflows', value: String(packaged.length) },
        { label: 'Standalone workflows', value: String(standalone.length) }
      ],
      metadata
    },
    'packaged-workflows': {
      source: 'packaged-workflows',
      rows: packaged,
      metadata
    },
    'standalone-workflows': {
      source: 'standalone-workflows',
      rows: standalone,
      metadata
    },
    'workflow-reports': {
      source: 'workflow-reports',
      rows: outcomes.flatMap((row) => {
        const report = deriveWorkflowReport(row);
        return report ? [report] : [];
      }).sort(compareWorkflowReports),
      metadata: sources.outcomes?.metadata ?? unavailableMetadata()
    }
  };
}

/** @param {Row} row @returns {Row | null} */
function deriveWorkflowReport(row) {
  const repository = text(row['runtime-repository']) || qualifiedRepository(row);
  const workflow = text(row.workflow);
  const safeOutput = text(row['safe-output']);
  if (!repository || repository.toLowerCase() === 'unknown' || !workflow) return null;
  const sourceLink = ['external-link', 'issue-link', 'pull-request-link', 'run-link']
    .map((field) => row[field])
    .find(isPlainObject);
  return {
    'workflow-route': `${repository}:${workflow}`,
    'safe-output': safeOutput,
    'outcome-title': text(row['outcome-title']) || safeOutput || 'Untitled report',
    'outcome-summary': text(row['outcome-summary']) || 'No report summary was provided.',
    'outcome-status': text(row['outcome-status']) || text(row['outcome-state']) || 'unknown',
    'rollout-mode': text(row['rollout-mode']) || 'unknown',
    'outcome-category': text(row['outcome-category']) || 'unknown',
    'observed-at': row['observed-at'] ?? row['published-at'],
    ...(sourceLink
      ? {
          'external-link': {
            ...sourceLink,
            ...(safeOutput
              ? {
                  'dashboard-href': `#page-outcome-detail?outcome=${encodeURIComponent(safeOutput)}`,
                  'dashboard-label': `View ${text(row['outcome-title']) || safeOutput}`
                }
              : {})
          }
        }
      : {})
  };
}

/** @param {Row} row */
function derivePackagedWorkflow(row) {
  const packageId = text(row.package);
  const repositoryLink = isPlainObject(row['repository-link']) ? row['repository-link'] : null;
  return {
    package: packageId,
    'package-name': text(row['package-name']) || titleCase(packageId),
    repository: qualifiedRepository(row),
    workflow: text(row.workflow),
    'workflow-name': text(row['workflow-name']) || text(row.workflow),
    'workflow-role': text(row['workflow-role']) || 'unknown',
    'rollout-mode': text(row['rollout-mode']) || 'unknown',
    'workflow-active': text(row['workflow-active']) || 'unknown',
    ...(repositoryLink
      ? {
          'package-link': {
            ...repositoryLink,
            'dashboard-href': `#page-operational-value?package=${encodeURIComponent(packageId)}`,
            'dashboard-label': `View ${text(row['package-name']) || titleCase(packageId)} package dashboard`
          }
        }
      : {}),
    ...(row['repository-link'] ? { 'repository-link': row['repository-link'] } : {}),
    ...(row['workflow-link'] ? { 'workflow-link': row['workflow-link'] } : {})
  };
}

/** @param {Row} row */
function deriveStandaloneWorkflow(row) {
  return {
    repository: qualifiedRepository(row),
    workflow: text(row.workflow),
    'workflow-name': text(row['workflow-name']) || text(row.workflow),
    'rollout-mode': text(row['rollout-mode']) || 'unknown',
    'workflow-active': text(row['workflow-active']) || 'unknown',
    ...(row['repository-link'] ? { 'repository-link': row['repository-link'] } : {}),
    ...(row['workflow-link'] ? { 'workflow-link': row['workflow-link'] } : {})
  };
}

/** @param {Row} left @param {Row} right */
function comparePackagedWorkflows(left, right) {
  return text(left['package-name']).localeCompare(text(right['package-name']))
    || roleOrder(left['workflow-role']) - roleOrder(right['workflow-role'])
    || text(left['workflow-name']).localeCompare(text(right['workflow-name']));
}

/** @param {Row} left @param {Row} right */
function compareStandaloneWorkflows(left, right) {
  return text(left.repository).localeCompare(text(right.repository))
    || text(left['workflow-name']).localeCompare(text(right['workflow-name']));
}

/** @param {Row} left @param {Row} right */
function compareWorkflowReports(left, right) {
  return derivedReportTime(right) - derivedReportTime(left)
    || text(left['outcome-title']).localeCompare(text(right['outcome-title']));
}

/** @param {Row} row */
function derivedReportTime(row) {
  const value = Date.parse(text(row['observed-at']));
  return Number.isFinite(value) ? value : 0;
}

/** @param {unknown} role */
function roleOrder(role) {
  return role === 'orchestrator' ? 0 : role === 'worker' ? 1 : 2;
}

/** @param {Row} row */
function qualifiedRepository(row) {
  const repository = text(row.repository);
  if (!repository) return 'unknown';
  if (repository.includes('/')) return repository;
  const organization = text(row.organization);
  return organization ? `${organization}/${repository}` : repository;
}

/** @param {string} value */
function titleCase(value) {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

/** @param {unknown} value */
function text(value) {
  return value == null ? '' : String(value).trim();
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** @returns {import('./presenter.js').SourceMetadata} */
function unavailableMetadata() {
  return {
    'source-id': 'workflow-topology-derived',
    'source-kind': 'derived',
    'as-of': new Date(0).toISOString(),
    'retrieved-at': new Date(0).toISOString(),
    completeness: 'unknown',
    freshness: 'unknown',
    availability: 'unavailable'
  };
}
