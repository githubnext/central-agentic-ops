/**
 * Route-aware workflow runtime and operational-value view.
 */

import { h } from '../dom.js';
import { octicon } from '../octicons.js';
import { formatNumber } from '../view-formatters.js';
import { renderStatusBadge } from './badge.js';
import { listChartSeries, renderChartWidget, renderPieLegend } from './chart-elements.js';
import { findLink, renderExternalLink } from './link-content.js';
import { isApprovalConclusion, isFailureConclusion } from './run-classification.js';
import { formatUtcDateTime } from './ui-primitives.js';
import { renderTitledBodySection } from './view-chrome.js';

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderWorkflowRuntime(context) {
  const root = h('div', {
    className: 'workflow-runtime',
    'data-route-view': '',
    'data-route-parameter': context.routeParameter
  });

  /** @param {unknown} routeValue */
  const render = (routeValue) => {
    const identity = parseWorkflowRoute(routeValue);
    const workflow = rowsFor(context.sources, 'workflows')
      .find((candidate) => identity && matchesWorkflow(candidate, identity.repository, identity.workflow));
    root.dataset.workflow = identity ? `${identity.repository}:${identity.workflow}` : '';
    root.replaceChildren(workflow
      ? renderWorkflowRuntimeContent(context, workflow)
      : h('p', { className: 'empty' }, identity ? 'Workflow not found.' : 'Select a workflow to inspect its runtime.'));

    if (workflow) {
      const repository = qualifiedRepository(workflow);
      const workflowName = text(workflow['workflow-name']) || text(workflow.workflow) || 'Unknown workflow';
      root.dispatchEvent(new CustomEvent('dashboard-route-allocation', {
        bubbles: true,
        detail: {
          title: workflowName,
          description: `Run health, AI Credit usage, and operational value for ${text(workflow.workflow)} in ${repository}.`,
          mode: ['review', 'live'].includes(text(workflow['rollout-mode'])) ? text(workflow['rollout-mode']) : '',
          navigationPage: workflow.package ? 'packages' : 'repositories'
        }
      }));
    }
  };

  root.addEventListener('dashboard-route-change', (event) => {
    if (!(event instanceof CustomEvent) || event.detail?.parameter !== context.routeParameter) return;
    render(event.detail.value);
  });
  render('');
  return root;
}

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @param {Record<string, unknown>} workflow
 */
function renderWorkflowRuntimeContent(context, workflow) {
  const repository = qualifiedRepository(workflow);
  const workflowPath = text(workflow.workflow);
  const workflowName = text(workflow['workflow-name']) || workflowPath || 'Unknown workflow';
  const runs = matchingRows(context, 'runs', repository, workflowPath);
  const usage = matchingRows(context, 'usage', repository, workflowPath);
  const observations = comparableObservations(
    matchingRows(context, 'operational-values', repository, workflowPath)
  );

  return h(
    'div',
    { className: 'workflow-runtime-content' },
    renderWorkflowTabs(context.pageId, repository, workflowPath, workflowName),
    renderWorkflowIdentity(workflow),
    renderRuntimeMetrics(context, workflow, runs, usage),
    renderValueReport(workflowName, repository, workflowPath, observations, context.sources['operational-values']?.metadata)
  );
}

/**
 * @param {string} pageId
 * @param {string} repository
 * @param {string} workflow
 * @param {string} workflowName
 */
function renderWorkflowTabs(pageId, repository, workflow, workflowName) {
  const route = workflowRouteValue(repository, workflow);
  return h(
    'nav',
    { className: 'repository-tabs', 'aria-label': `${workflowName} views` },
    h(
      'a',
      { href: `#page-${pageId}?workflow=${encodeURIComponent(route)}`, 'aria-current': 'page' },
      octicon('graph'),
      h('span', null, 'Insights')
    ),
    h(
      'a',
      { href: `#page-workflow-detail?workflow=${encodeURIComponent(route)}` },
      octicon('issue'),
      h('span', null, 'Reports')
    )
  );
}

/** @param {Record<string, unknown>} workflow */
function renderWorkflowIdentity(workflow) {
  const link = findLink(workflow, 'workflow-link');
  const role = text(workflow['workflow-role']) || 'unknown';
  return h(
    'section',
    { className: 'workflow-identity', 'aria-label': 'Workflow identity' },
    h(
      'div',
      null,
      h(
        'span',
        { className: 'repository-workflow-badges' },
        workflow.package
          ? h('a', { href: `#page-package-detail?package=${encodeURIComponent(text(workflow.package))}` }, text(workflow['package-name']) || text(workflow.package))
          : null,
        h('span', null, titleCase(role))
      ),
      h('p', null, h('code', null, text(workflow.workflow)))
    ),
    link ? renderExternalLink(link) : null
  );
}

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @param {Record<string, unknown>} workflow
 * @param {Array<Record<string, unknown>>} runs
 * @param {Array<Record<string, unknown>>} usage
 */
function renderRuntimeMetrics(context, workflow, runs, usage) {
  const runMetadata = context.sources.runs?.metadata;
  const usageMetadata = context.sources.usage?.metadata;
  const healthAvailable = runMetadata?.availability === 'available';
  const usageAvailable = usageMetadata?.availability === 'available';
  const health = summarizeRunHealth(runs);
  const usageTotal = usage.reduce((total, row) => total + finiteNumber(row.aic), 0);
  const registration = text(workflow['workflow-active']) === 'true'
    ? 'active'
    : text(workflow['workflow-active']) === 'false' ? 'disabled' : 'unknown';

  return h(
    'section',
    { className: 'repository-workflow-summary workflow-runtime-summary', 'aria-label': 'Workflow execution summary' },
    h(
      'dl',
      { className: 'workflow-runtime-metrics' },
      renderRunHealthMetric(health, healthAvailable, coverageLabel(runMetadata)),
      renderSimpleMetric('Registration', registration, 'Current GitHub Actions state'),
      renderSimpleMetric(
        'AI Credits',
        usageAvailable ? formatNumber(usageTotal, { name: 'AI Credits', symbol: 'AIC', significant: 0.1 }) : '—',
        `${usage.length.toLocaleString('en')} retained ${usage.length === 1 ? 'run' : 'runs'}${usageMetadata?.completeness === 'complete' ? '' : '; partial coverage'}`
      )
    )
  );
}

/**
 * @param {{ total: number, successful: number, failed: number, approval: number, pending: number, other: number }} health
 * @param {boolean} available
 * @param {string} coverage
 */
function renderRunHealthMetric(health, available, coverage) {
  if (!available) {
    return h(
      'div',
      { className: 'workflow-run-health' },
      h('dt', null, 'Run health'),
      h('dd', null, '—'),
      h('p', null, coverage)
    );
  }
  const entries = [
    ['Successful', health.successful],
    ['Failed', health.failed],
    ['Approval required', health.approval],
    ['Pending', health.pending],
    ['Skipped / neutral / stale / cancelled', health.other]
  ];
  return h(
    'div',
    { className: 'workflow-run-health' },
    h('dt', null, 'Run health'),
    h(
      'dd',
      { className: 'workflow-health-chart' },
      renderChartWidget(
        'pie',
        entries.map(([label, value]) => ({ x: String(label), y: Number(value), color: null })),
        [],
        { entries: /** @type {Array<[string, number]>} */ (entries), total: health.total },
        'runs'
      ),
      h('span', { className: 'workflow-health-total' }, h('strong', null, formatNumber(health.total)), h('small', null, 'runs'))
    ),
    renderPieLegend(/** @type {Array<[string, number]>} */ (entries), health.total),
    h('p', null, coverage)
  );
}

/** @param {string} label @param {string} value @param {string} detail */
function renderSimpleMetric(label, value, detail) {
  return h('div', null, h('dt', null, label), h('dd', null, value), h('p', null, detail));
}

/**
 * @param {string} workflowName
 * @param {string} repository
 * @param {string} workflowPath
 * @param {Array<Record<string, unknown>>} observations
 * @param {import('../presenter.js').SourceMetadata | undefined} metadata
 */
function renderValueReport(workflowName, repository, workflowPath, observations, metadata) {
  const headingId = `workflow-${slugify(workflowRouteValue(repository, workflowPath))}-value-heading`;
  if (observations.length === 0) {
    const unavailable = metadata?.availability === 'unavailable';
    return h(
      'section',
      { className: 'value-report value-report-empty', 'aria-labelledby': headingId },
      h(
        'header',
        null,
        h('div', null, h('h2', { id: headingId }, workflowName), h('p', null, `${repository} - ${workflowPath}`)),
        renderStatusBadge(unavailable ? 'Unavailable' : 'Not evaluated')
      ),
      h(
        'div',
        { className: 'value-empty' },
        octicon('graph'),
        h('h3', null, unavailable ? 'Operational-value evidence unavailable' : 'No workflow observations yet'),
        unavailable
          ? h('p', null, 'Operational-value collection was unavailable for this dashboard refresh.')
          : h('p', null, 'Operational value will appear after this workflow publishes a valid ', h('code', null, 'grader_results.json'), '.')
      ),
      h('div', { className: 'value-details-unavailable' }, 'Run evidence unavailable')
    );
  }

  const latest = observations.at(-1) ?? {};
  const matured = observations.filter((row) => text(row['maturity-status']) === 'matured');
  const matureAverage = matured.length > 0
    ? matured.reduce((total, row) => total + finiteNumber(row['operational-value']), 0) / matured.length
    : null;
  const points = observations.map((row) => ({
    x: formatObservationDate(row['observed-at']),
    y: finiteNumber(row['operational-value']),
    color: null
  }));

  return h(
    'section',
    { className: 'value-report', 'aria-labelledby': headingId },
    h(
      'header',
      null,
      h(
        'div',
        null,
        h('h2', { id: headingId }, workflowName),
        h('p', null, `${repository} - ${workflowPath}`),
        h('p', null, "Run-scoped attainment from the workflow's frozen operational-value evaluator.")
      ),
      h('div', { className: 'value-score' }, h('strong', null, formatPercent(latest['operational-value'])), h('span', null, 'Latest observation'))
    ),
    h(
      'div',
      { className: 'value-chart', role: 'group', 'aria-label': 'Operational-value summary' },
      renderChartWidget('line', points, listChartSeries(points)),
      h(
        'dl',
        null,
        valueMetric('Latest', formatPercent(latest['operational-value'])),
        valueMetric('Mature average', formatPercent(matureAverage)),
        valueMetric('Opportunities', formatNumber(observations.length)),
        valueMetric('Evaluator', text(latest['evaluator-digest']) ? h('code', null, text(latest['evaluator-digest']).slice(0, 12)) : 'Unavailable')
      )
    ),
    h(
      'details',
      { className: 'value-details-disclosure' },
      h('summary', null, 'View run evidence'),
      h(
        'div',
        { className: 'value-details' },
        renderTitledBodySection(
          '',
          'Workflow observations',
          [
            h('p', null, 'Missing, failed, and null grader results are excluded rather than scored as zero.'),
            renderObservationTable(observations)
          ],
          {
            headingTag: 'h3'
          }
        )
      )
    )
  );
}

/** @param {string} label @param {string | HTMLElement} value */
function valueMetric(label, value) {
  return h('div', null, h('dt', null, label), h('dd', null, value));
}

/** @param {Array<Record<string, unknown>>} observations */
function renderObservationTable(observations) {
  return h(
    'div',
    { className: 'table-region', role: 'region', tabIndex: 0, 'aria-label': 'Workflow operational-value observations' },
    h(
      'table',
      null,
      h('thead', null, h('tr', null, ...['Observed', 'Opportunity', 'Value', 'Evidence'].map((label) => h('th', { scope: 'col' }, label)))),
      h(
        'tbody',
        null,
        ...[...observations].reverse().map((row) => {
          const runLink = findLink(row, 'run-link');
          const evidenceLink = findLink(row, 'evidence-link');
          const observed = formatObservationDate(row['observed-at']);
          return h(
            'tr',
            null,
            h('th', { scope: 'row' }, runLink ? h('a', { href: runLink.href, 'aria-label': runLink.label }, observed) : observed),
            h('td', null, text(row['operational-case']) || 'unknown'),
            h('td', null, formatPercent(row['operational-value'])),
            h(
              'td',
              null,
              renderStatusBadge(text(row['maturity-status']) === 'matured' ? 'Mature' : 'As of run'),
              evidenceLink ? h('span', null, ' ', renderExternalLink(evidenceLink)) : null
            )
          );
        })
      )
    )
  );
}

/** @param {Array<Record<string, unknown>>} observations */
function comparableObservations(observations) {
  const valid = observations.filter((row) => (
    Number.isFinite(Number(row['operational-value']))
    && text(row['evaluator-digest'])
    && text(row['operational-case'])
  ));
  const latestEvaluator = valid
    .toSorted((left, right) => evidenceAssignmentTime(right) - evidenceAssignmentTime(left))[0]?.['evaluator-digest'];
  if (!latestEvaluator) return [];

  const opportunities = new Map();
  for (const row of valid.filter((candidate) => candidate['evaluator-digest'] === latestEvaluator)) {
    const key = `${qualifiedRepository(row)}:${text(row['operational-case'])}`;
    const existing = opportunities.get(key);
    if (!existing || rowTime(row) >= rowTime(existing)) opportunities.set(key, row);
  }
  return [...opportunities.values()].sort((left, right) => rowTime(left) - rowTime(right));
}

/** @param {Record<string, unknown>} row */
function evidenceAssignmentTime(row) {
  const value = Date.parse(text(row['requested-evidence-at'] ?? row['observed-at']));
  return Number.isFinite(value) ? value : 0;
}

/** @param {Array<Record<string, unknown>>} runs */
function summarizeRunHealth(runs) {
  const health = { total: runs.length, successful: 0, failed: 0, approval: 0, pending: 0, other: 0 };
  for (const run of runs) {
    const conclusion = run['run-conclusion'];
    const status = text(run['run-status']);
    if (conclusion === 'success') health.successful += 1;
    else if (isFailureConclusion(conclusion)) health.failed += 1;
    else if (isApprovalConclusion(conclusion)) health.approval += 1;
    else if (status && status !== 'completed') health.pending += 1;
    else health.other += 1;
  }
  return health;
}

/** @param {import('../presenter.js').SourceMetadata | undefined} metadata */
function coverageLabel(metadata) {
  if (metadata?.availability !== 'available') return 'Actions run data unavailable';
  const start = Date.parse(String(metadata['coverage-start'] ?? ''));
  const end = Date.parse(String(metadata['coverage-end'] ?? ''));
  const hours = Number.isFinite(start) && Number.isFinite(end) && end > start
    ? Math.round((end - start) / 3_600_000)
    : null;
  const completeness = metadata.completeness === 'complete' ? 'Complete' : metadata.completeness === 'partial' ? 'Partial' : 'Unknown';
  return `${completeness}${hours ? ` ${hours}-hour` : ''} Actions run window`;
}

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @param {string} sourceName
 * @param {string} repository
 * @param {string} workflow
 */
function matchingRows(context, sourceName, repository, workflow) {
  return rowsFor(context.sources, sourceName).filter((row) => matchesWorkflow(row, repository, workflow));
}

/** @param {Record<string, unknown>} row @param {string} repository @param {string} workflow */
function matchesWorkflow(row, repository, workflow) {
  return qualifiedRepository(row).toLowerCase() === repository.toLowerCase()
    && text(row.workflow) === workflow;
}

/** @param {Record<string, import('../presenter.js').LogicalSourceInput>} sources @param {string} source */
function rowsFor(sources, source) {
  return Array.isArray(sources[source]?.rows) ? sources[source].rows : [];
}

/** @param {Record<string, unknown>} row */
function qualifiedRepository(row) {
  const repository = text(row.repository);
  return repository.includes('/') ? repository : `${text(row.organization)}/${repository}`.replace(/^\/|\/$/g, '');
}

/** @param {unknown} routeValue */
function parseWorkflowRoute(routeValue) {
  if (typeof routeValue !== 'string') return null;
  const separator = routeValue.indexOf(':');
  if (separator < 1) return null;
  const repository = routeValue.slice(0, separator);
  const workflow = routeValue.slice(separator + 1);
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9.-]{0,98}[A-Za-z0-9])?\/[A-Za-z0-9_.-]{1,100}$/.test(repository)) return null;
  if (!/^\.github\/workflows\/[A-Za-z0-9_./-]+\.md$/.test(workflow) || workflow.includes('..')) return null;
  return { repository, workflow };
}

/** @param {string} repository @param {string} workflow */
export function workflowRouteValue(repository, workflow) {
  return `${repository}:${workflow}`;
}

/** @param {Record<string, unknown>} row */
function rowTime(row) {
  const value = Date.parse(text(row['observed-at']));
  return Number.isFinite(value) ? value : 0;
}

/** @param {unknown} value */
function formatObservationDate(value) {
  const date = text(value);
  return Number.isFinite(Date.parse(date)) ? formatUtcDateTime(date) : 'Unknown';
}

/** @param {unknown} value */
function formatPercent(value) {
  const numeric = value == null || value === '' ? Number.NaN : Number(value);
  return Number.isFinite(numeric)
    ? new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 1 }).format(numeric)
    : 'Not observed';
}

/** @param {unknown} value */
function finiteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

/** @param {unknown} value */
function text(value) {
  return value == null ? '' : String(value);
}

/** @param {string} value */
function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** @param {string} value */
function titleCase(value) {
  return value.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
