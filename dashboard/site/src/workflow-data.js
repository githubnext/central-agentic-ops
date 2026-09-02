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
  const runsAvailable = sources.runs?.metadata?.availability !== 'unavailable' && Array.isArray(sources.runs?.rows);
  const runs = runsAvailable ? sources.runs.rows : [];
  const usage = Array.isArray(sources.usage?.rows) ? sources.usage.rows : [];
  const outcomes = Array.isArray(sources.outcomes?.rows) ? sources.outcomes.rows : [];
  const workflowRuns = summarizeWorkflowRuns(workflows, runsAvailable ? runs : null);
  const workflowAic = summarizeWorkflowAic(workflows, usage);
  /** @param {Row} row */
  const isPackaged = (row) => row['workflow-role'] !== 'standalone' && Boolean(text(row.package));
  const packaged = workflows
    .filter(isPackaged)
    .map((row) => derivePackagedWorkflow(row, workflowRuns.get(row), workflowAic.get(row)))
    .sort(comparePackagedWorkflows);
  // Every row not captured above (including rows with an unrecognized or
  // missing workflow-role) is repository-owned; the two buckets must
  // together account for every row so no workflow is silently dropped.
  const standalone = workflows
    .filter((row) => !isPackaged(row))
    .map((row) => deriveStandaloneWorkflow(row, workflowRuns.get(row), workflowAic.get(row)))
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
      }).sort(compareReports),
      metadata: sources.outcomes?.metadata ?? unavailableMetadata()
    },
    'workflow-runs': {
      source: 'workflow-runs',
      rows: runs.flatMap((row) => {
        const run = deriveWorkflowRun(row);
        return run ? [run] : [];
      }).sort(compareRuns),
      metadata: sources.runs?.metadata ?? unavailableMetadata()
    },
    'package-reports': {
      source: 'package-reports',
      rows: outcomes.flatMap((row) => {
        const report = derivePackageReport(row, workflows);
        return report ? [report] : [];
      }).sort(compareReports),
      metadata: sources.outcomes?.metadata ?? unavailableMetadata()
    }
  };
}

/** @param {Row} row @returns {Row | null} */
function deriveWorkflowRun(row) {
  const repository = qualifiedRepository(row);
  const workflow = text(row.workflow);
  if (!repository || repository.toLowerCase() === 'unknown' || !workflow || !text(row.run)) return null;
  return {
    'workflow-route': `${repository}:${workflow}`,
    ...row
  };
}

/** @param {Row} row @returns {Row | null} */
function deriveWorkflowReport(row) {
  const repository = text(row['runtime-repository']) || qualifiedRepository(row);
  const workflow = text(row.workflow);
  if (!repository || repository.toLowerCase() === 'unknown' || !workflow) return null;
  return {
    'workflow-route': `${repository}:${workflow}`,
    ...deriveReport(row)
  };
}

/** @param {Row} row @param {Row[]} workflows @returns {Row | null} */
function derivePackageReport(row, workflows) {
  const packageId = attributedPackage(row, workflows);
  if (!packageId) return null;
  const report = deriveReport(row);
  return {
    package: packageId,
    ...report
  };
}

/** @param {Row} row */
function deriveReport(row) {
  const safeOutput = text(row['safe-output']);
  const sourceLink = ['issue-link', 'pull-request-link', 'run-link', 'external-link']
    .map((field) => row[field])
    .find(isPlainObject);
  return {
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
            relation: 'external',
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

/** @param {Row} outcome @param {Row[]} workflows */
function attributedPackage(outcome, workflows) {
  const explicitPackage = text(outcome.package);
  if (explicitPackage) return explicitPackage;
  const workflow = workflows.find((candidate) => sameWorkflowScope(outcome, candidate)
    && (
      normalizeWorkflowIdentity(candidate.workflow) === normalizeWorkflowIdentity(outcome.workflow)
      || normalizeWorkflowIdentity(candidate['workflow-name']) === normalizeWorkflowIdentity(outcome['workflow-name'])
    ));
  return text(workflow?.package);
}

/** @param {Row} outcome @param {Row} workflow */
function sameWorkflowScope(outcome, workflow) {
  const outcomeRepository = text(outcome.repository).toLowerCase();
  const workflowRepository = text(workflow.repository).toLowerCase();
  const outcomeOrganization = text(outcome.organization).toLowerCase();
  const workflowOrganization = text(workflow.organization).toLowerCase();
  return (!outcomeRepository || !workflowRepository || outcomeRepository === workflowRepository)
    && (!outcomeOrganization || !workflowOrganization || outcomeOrganization === workflowOrganization);
}

/** @param {unknown} value */
function normalizeWorkflowIdentity(value) {
  return text(value).toLowerCase().replace(/\.lock\.yml$/, '.md');
}

/** @param {Row} row @param {number | undefined} runs @param {number | undefined} aic */
function derivePackagedWorkflow(row, runs, aic) {
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
    ...(runs === undefined ? {} : { runs }),
    ...(aic === undefined ? {} : { aic }),
    ...(repositoryLink
      ? {
          'package-link': {
            ...repositoryLink,
            'dashboard-href': `#page-package-insights?package=${encodeURIComponent(packageId)}`,
            'dashboard-label': `View ${text(row['package-name']) || titleCase(packageId)} package dashboard`
          }
        }
      : {}),
    ...(row['repository-link'] ? { 'repository-link': row['repository-link'] } : {}),
    ...(row['workflow-link'] ? { 'workflow-link': row['workflow-link'] } : {})
  };
}

/** @param {Row} row @param {number | undefined} runs @param {number | undefined} aic */
function deriveStandaloneWorkflow(row, runs, aic) {
  return {
    repository: qualifiedRepository(row),
    workflow: text(row.workflow),
    'workflow-name': text(row['workflow-name']) || text(row.workflow),
    'rollout-mode': text(row['rollout-mode']) || 'unknown',
    'workflow-active': text(row['workflow-active']) || 'unknown',
    ...(runs === undefined ? {} : { runs }),
    ...(aic === undefined ? {} : { aic }),
    ...(row['repository-link'] ? { 'repository-link': row['repository-link'] } : {}),
    ...(row['workflow-link'] ? { 'workflow-link': row['workflow-link'] } : {})
  };
}

/**
 * @param {Row[]} workflows
 * @param {Row[] | null} runs
 * @returns {Map<Row, number>}
 */
function summarizeWorkflowRuns(workflows, runs) {
  const totals = new Map();
  if (runs === null) return totals;
  for (const workflow of workflows) totals.set(workflow, 0);
  for (const run of runs) {
    const workflow = matchedWorkflow(workflows, run);
    if (workflow) totals.set(workflow, (totals.get(workflow) ?? 0) + 1);
  }
  return totals;
}

/**
 * Attribute each usage observation only when it identifies one workflow row.
 * @param {Row[]} workflows
 * @param {Row[]} usage
 * @returns {Map<Row, number>}
 */
export function summarizeWorkflowAic(workflows, usage) {
  const totals = new Map();
  for (const observation of usage) {
    const aic = Number(observation.aic);
    if (!Number.isFinite(aic) || aic < 0 || !text(observation.workflow)) continue;
    const workflow = matchedWorkflow(workflows, observation);
    if (!workflow) continue;
    totals.set(workflow, (totals.get(workflow) ?? 0) + aic);
  }
  return totals;
}

/** @param {Row[]} workflows @param {Row} observation @returns {Row | undefined} */
function matchedWorkflow(workflows, observation) {
  const candidates = workflows.filter((workflow) => (
    normalizeWorkflowIdentity(workflow.workflow) === normalizeWorkflowIdentity(observation.workflow)
    && sameWorkflowScope(observation, workflow)
  ));
  return candidates.length === 1 ? candidates[0] : undefined;
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
function compareReports(left, right) {
  return derivedReportTime(right) - derivedReportTime(left)
    || text(left['outcome-title']).localeCompare(text(right['outcome-title']));
}

/** @param {Row} left @param {Row} right */
function compareRuns(left, right) {
  return derivedRunTime(right) - derivedRunTime(left)
    || text(right.run).localeCompare(text(left.run), 'en', { numeric: true });
}

/** @param {Row} row */
function derivedRunTime(row) {
  const value = Date.parse(text(row['started-at']));
  return Number.isFinite(value) ? value : 0;
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
