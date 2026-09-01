/**
 * Route-aware workflow runtime and operational-value view.
 */

import { h } from '../dom.js';
import { octicon } from '../octicons.js';
import { formatNumber } from '../view-formatters.js';
import { renderStatusBadge } from './badge.js';
import { listChartSeries, renderChartLegend, renderChartWidget, renderPieLegend } from './chart-elements.js';
import { findLink, renderExternalLink } from './link-content.js';
import { isApprovalConclusion, isFailureConclusion } from './run-classification.js';
import { formatUtcDateTime } from './ui-primitives.js';
import { renderTitledBodySection } from './view-chrome.js';
import { renderWorkflowIdentity } from './workflow-identity.js';
import { renderLinkTabs } from './tab-nav.js';
import { createRouteView } from './route-empty-state.js';
import { parseWorkflowRoute, workflowRouteValue } from './workflow-route.js';

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderWorkflowRuntime(context) {
  const root = createRouteView({
    rootClassName: 'workflow-runtime',
    routeParameter: context.routeParameter,
    datasetKey: 'workflow',
    selectMessage: 'Select a workflow to inspect its runtime.',
    notFoundMessage: 'Workflow not found.',
    hasSelection: (routeValue) => parseWorkflowRoute(routeValue) !== null,
    renderMatched: (routeValue) => {
      const identity = parseWorkflowRoute(routeValue);
      const workflow = rowsFor(context.sources, 'workflows')
        .find((candidate) => identity && matchesWorkflow(candidate, identity.repository, identity.workflow));
      if (!workflow || !identity) {
        return null;
      }
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
      return renderWorkflowRuntimeContent(context, workflow);
    }
  });
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
  const observations = latestEvaluatorObservations(
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
  return renderLinkTabs({
    className: 'repository-tabs',
    ariaLabel: `${workflowName} views`,
    tabs: [
      { label: 'Insights', icon: 'graph', href: `#page-${pageId}?workflow=${encodeURIComponent(route)}`, current: true },
      { label: 'Reports', icon: 'issue', href: `#page-workflow-detail?workflow=${encodeURIComponent(route)}` }
    ]
  });
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

  const comparable = comparableObservations(observations);
  const latest = comparable.at(-1) ?? observations.at(-1) ?? {};
  const matured = comparable.filter((row) => text(row['maturity-status']) === 'matured');
  const matureAverage = matured.length > 0
    ? matured.reduce((total, row) => total + finiteNumber(row['operational-value']), 0) / matured.length
    : null;
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
      renderValueHistory(observations),
      h(
        'dl',
        null,
        valueMetric('Latest', formatPercent(latest['operational-value'])),
        valueMetric('Mature average', formatPercent(matureAverage)),
        valueMetric('Opportunities', formatNumber(comparable.length)),
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
            renderObservationTable(comparable)
          ],
          {
            headingTag: 'h3'
          }
        )
      )
    )
  );
}

/** @param {Array<Record<string, unknown>>} observations */
function renderValueHistory(observations) {
  const diagnostics = diagnosticSeries(observations);
  const weekly = weeklyAttainment(observations);
  const sections = [];
  if (diagnostics.length > 0) {
    sections.push(h(
      'section',
      { className: 'value-history-panel value-outcomes', 'aria-labelledby': 'value-outcomes-heading' },
      h('header', null,
        h('h3', { id: 'value-outcomes-heading' }, 'Outcome change from first observation'),
        h('p', null, 'Positive values mean improvement according to each diagnostic direction.')
      ),
      renderDiagnosticChart(diagnostics),
      h(
        'ul',
        { className: 'chart-legend value-diagnostic-legend' },
        diagnostics.map((series, index) => h(
          'li',
          null,
          h('i', { className: `chart-series-${(index % 6) + 1}`, 'aria-hidden': 'true' }),
          h('span', null, series.name),
          h('strong', { className: series.latestChange > 0 ? 'value-gain' : series.latestChange < 0 ? 'value-loss' : '' }, formatPointChange(series.latestChange))
        ))
      )
    ));
  }
  if (weekly.length > 0) {
    const primaryPoints = weekly.flatMap((week, index) => [
      { x: formatWeek(week.weekStart), y: week.value, color: 'Weekly value' },
      { x: formatWeek(week.weekStart), y: rollingMean(weekly, index), color: '4-week rolling mean' }
    ]);
    const primarySeries = [
      { name: 'Weekly value', className: 'primary-weekly' },
      { name: '4-week rolling mean', className: 'primary-rolling' }
    ];
    sections.push(h(
      'section',
      { className: 'value-history-panel value-attainment', 'aria-labelledby': 'value-attainment-heading' },
      h('header', null,
        h('h3', { id: 'value-attainment-heading' }, 'Weekly operational attainment'),
        h('p', null, 'Weekly opportunity-adjusted values and their 4-week rolling mean; separate from outcome diagnostics.')
      ),
      renderChartWidget('line', primaryPoints, primarySeries),
      renderChartLegend(primarySeries, 'line')
    ));
  }
  return h('div', { className: 'value-history' }, sections);
}

/** @param {Array<{ name: string, points: Array<{ weekStart: string, change: number }>, latestChange: number }>} series */
function renderDiagnosticChart(series) {
  const allWeeks = [...new Set(series.flatMap((item) => item.points.map((point) => point.weekStart)))].sort();
  const maximumChange = Math.max(0.1, ...series.flatMap((item) => item.points.map((point) => Math.abs(point.change))));
  const extent = Math.min(1, Math.ceil(maximumChange * 10) / 10);
  const xFor = (weekStart) => allWeeks.length < 2 ? 54 : 10 + (allWeeks.indexOf(weekStart) / (allWeeks.length - 1)) * 88;
  const yFor = (change) => 21 - (change / extent) * 17;
  const grid = [-extent, 0, extent];
  return h(
    'div',
    { className: 'diagnostic-chart', 'data-chart-widget': 'diagnostic-change' },
    h(
      'svg',
      { viewBox: '0 0 100 46', role: 'img', 'aria-label': `Diagnostic outcome change: ${series.map((item) => `${item.name} ${formatPointChange(item.latestChange)}`).join(', ')}` },
      h('rect', { className: 'diagnostic-gain-zone', x: 10, y: 4, width: 88, height: 17 }),
      h('rect', { className: 'diagnostic-loss-zone', x: 10, y: 21, width: 88, height: 17 }),
      ...grid.flatMap((change) => {
        const y = yFor(change);
        return [
          h('line', { className: change === 0 ? 'diagnostic-baseline' : 'line-chart-grid', x1: 10, y1: y, x2: 98, y2: y }),
          h('text', { className: 'diagnostic-axis-label', x: 8, y: y + 1.5, 'text-anchor': 'end' }, formatPointChange(change, false))
        ];
      }),
      ...series.flatMap((item, index) => {
        const className = `chart-series-${(index % 6) + 1}`;
        const coordinates = item.points.map((point) => ({ ...point, x: xFor(point.weekStart), y: yFor(point.change) }));
        return [
          h('polyline', { className: `diagnostic-series ${className}`, points: coordinates.map((point) => `${point.x},${point.y}`).join(' '), fill: 'none' }),
          ...coordinates.map((point) => h(
            'circle',
            { className: `diagnostic-point ${className}`, cx: point.x, cy: point.y, r: 1.7, tabIndex: 0, role: 'img', 'aria-label': `${item.name}, ${formatWeek(point.weekStart)}: ${formatPointChange(point.change)}` },
            h('title', null, `${item.name}, ${formatWeek(point.weekStart)}: ${formatPointChange(point.change)}`)
          ))
        ];
      })
    ),
    h('div', { className: 'chart-axis' }, h('span', null, formatWeek(allWeeks[0])), h('span', null, formatWeek(allWeeks.at(-1))))
  );
}

/** @param {Array<Record<string, unknown>>} observations */
function diagnosticSeries(observations) {
  const definitions = new Map();
  for (const row of observations) {
    for (const definition of Array.isArray(row['diagnostic-definitions']) ? row['diagnostic-definitions'] : []) {
      if (definition && text(definition.id)) definitions.set(text(definition.id), definition);
    }
    for (const id of Object.keys(isRecord(row.diagnostics) ? row.diagnostics : {})) {
      if (!definitions.has(id)) definitions.set(id, { id, name: humanizeIdentifier(id), direction: 'higher_is_better', aggregation: 'latest' });
    }
  }
  return [...definitions.values()].flatMap((definition) => {
    const weekly = weeklyDiagnostic(observations, text(definition.id), text(definition.aggregation));
    if (weekly.length === 0) return [];
    const first = weekly[0].value;
    const direction = text(definition.direction) === 'lower_is_better' ? -1 : 1;
    const points = weekly.map((week) => ({ weekStart: week.weekStart, change: (week.value - first) * direction }));
    return [{
      name: text(definition.name) || humanizeIdentifier(text(definition.id)),
      points,
      latestChange: points.at(-1)?.change ?? 0
    }];
  });
}

/** @param {Array<Record<string, unknown>>} observations @param {string} metricId @param {string} aggregation */
function weeklyDiagnostic(observations, metricId, aggregation) {
  const groups = groupObservationsByWeek(observations);
  return [...groups].sort(([left], [right]) => left.localeCompare(right)).flatMap(([weekStart, rows]) => {
    const values = rows.flatMap((row) => {
      const value = isRecord(row.diagnostics) ? normalizedValue(row.diagnostics[metricId]) : null;
      return value === null ? [] : [{ value, observedAt: rowTime(row) }];
    });
    if (values.length === 0) return [];
    const value = aggregation === 'mean'
      ? values.reduce((total, item) => total + item.value, 0) / values.length
      : values.toSorted((left, right) => left.observedAt - right.observedAt).at(-1)?.value;
    return value == null ? [] : [{ weekStart, value }];
  });
}

/** @param {Array<Record<string, unknown>>} observations */
function weeklyAttainment(observations) {
  return [...groupObservationsByWeek(observations)].sort(([left], [right]) => left.localeCompare(right)).flatMap(([weekStart, rows]) => {
    const opportunities = new Map();
    for (const row of rows) {
      const value = normalizedValue(row['operational-value']);
      if (value === null) continue;
      const key = text(row['operational-case']) || `run:${text(row.run)}`;
      const existing = opportunities.get(key);
      if (!existing || rowTime(row) >= rowTime(existing)) opportunities.set(key, row);
    }
    const values = [...opportunities.values()].map((row) => /** @type {number} */ (normalizedValue(row['operational-value'])));
    return values.length === 0 ? [] : [{ weekStart, value: values.reduce((total, value) => total + value, 0) / values.length }];
  });
}

/** @param {Array<Record<string, unknown>>} observations */
function groupObservationsByWeek(observations) {
  const groups = new Map();
  for (const row of observations) {
    const weekStart = utcWeekStart(row['observed-at']);
    if (!weekStart) continue;
    const rows = groups.get(weekStart) ?? [];
    rows.push(row);
    groups.set(weekStart, rows);
  }
  return groups;
}

/** @param {unknown} value */
function utcWeekStart(value) {
  const date = new Date(text(value));
  if (!Number.isFinite(date.getTime())) return '';
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString();
}

/** @param {Array<{ value: number }>} weekly @param {number} index */
function rollingMean(weekly, index) {
  const values = weekly.slice(Math.max(0, index - 3), index + 1).map((week) => week.value);
  return values.reduce((total, value) => total + value, 0) / values.length;
}

/** @param {unknown} value */
function normalizedValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= 1 ? numeric : null;
}

/** @param {unknown} value */
function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** @param {string} value */
function humanizeIdentifier(value) {
  const words = value.replaceAll(/[-_]+/g, ' ').trim();
  return words ? words[0].toUpperCase() + words.slice(1) : 'Diagnostic';
}

/** @param {number} value @param {boolean} [signed] */
function formatPointChange(value, signed = true) {
  const points = value * 100;
  const prefix = signed && points > 0 ? '+' : '';
  return `${prefix}${points.toFixed(1)} pts`;
}

/** @param {string | undefined} value */
function formatWeek(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Unknown';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value));
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
  const valid = observations.filter((row) => normalizedValue(row['operational-value']) !== null && text(row['operational-case']));

  const opportunities = new Map();
  for (const row of valid) {
    const key = `${qualifiedRepository(row)}:${text(row['operational-case'])}`;
    const existing = opportunities.get(key);
    if (!existing || rowTime(row) >= rowTime(existing)) opportunities.set(key, row);
  }
  return [...opportunities.values()].sort((left, right) => rowTime(left) - rowTime(right));
}

/** @param {Array<Record<string, unknown>>} observations */
function latestEvaluatorObservations(observations) {
  const valid = observations.filter((row) => text(row['evaluator-digest']));
  const latestEvaluator = valid
    .toSorted((left, right) => evidenceAssignmentTime(right) - evidenceAssignmentTime(left))[0]?.['evaluator-digest'];
  if (!latestEvaluator) return [];
  return valid.filter((candidate) => candidate['evaluator-digest'] === latestEvaluator)
    .sort((left, right) => rowTime(left) - rowTime(right));
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
