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

  if (page.page === 'workflows') {
    return renderWorkflowsPage(pageSources);
  }

  if (page.page === 'findings') {
    return renderFindingsPage(pageSources);
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
 * @returns {HTMLElement}
 */
function renderWorkflowsPage(pageSources) {
  const workflowsSource = pageSources.get('workflows');
  const runsSource = pageSources.get('runs');
  const outcomesSource = pageSources.get('outcomes');
  const usageSource = pageSources.get('usage');
  const findingsSource = pageSources.get('findings');
  const operationalValuesSource = pageSources.get('operational-values');

  const workflows = Array.isArray(workflowsSource?.rows) ? workflowsSource.rows : [];
  const runs = Array.isArray(runsSource?.rows) ? runsSource.rows : [];
  const outcomes = Array.isArray(outcomesSource?.rows) ? outcomesSource.rows : [];
  const usage = Array.isArray(usageSource?.rows) ? usageSource.rows : [];
  const findings = Array.isArray(findingsSource?.rows) ? findingsSource.rows : [];
  const operationalValues = Array.isArray(operationalValuesSource?.rows) ? operationalValuesSource.rows : [];

  const workflowItems = workflows.map((workflow, index) => ({
    key: getWorkflowKey(workflow, index),
    workflow,
    runCount: countMatchingRows(runs, workflow, 'workflow'),
    conclusionCounts: countByMatchingRows(runs, workflow, 'workflow', 'run-conclusion'),
    outcomeCount: countMatchingRows(outcomes, workflow, 'workflow'),
    aicTotal: sumMatchingNumericRows(usage, workflow, 'workflow', 'aic'),
    findingCount: countMatchingRows(findings, workflow, 'workflow'),
    operationalValueCount: countMatchingRows(operationalValues, workflow, 'workflow')
  }));

  return h(
    'div',
    { className: 'workflows-page' },
    h('h3', null, 'Workflow Inventory'),
    h(
      'table',
      { className: 'workflows-table' },
      h(
        'thead',
        null,
        h(
          'tr',
          null,
          h('th', null, 'Workflow'),
          h('th', null, 'Organization'),
          h('th', null, 'Repository'),
          h('th', null, 'Active State'),
          h('th', null, 'Rollout Mode'),
          h('th', null, 'Run Count'),
          h('th', null, 'Run Conclusions'),
          h('th', null, 'Outcome Count'),
          h('th', null, 'Available AIC'),
          h('th', null, 'Finding Count'),
          h('th', null, 'Operational Value Count')
        )
      ),
      h(
        'tbody',
        null,
        workflowItems.length > 0
          ? keyed(
            workflowItems,
            (item) => renderWorkflowRow(/** @type {{ key: string, workflow: Record<string, unknown>, runCount: number, conclusionCounts: Map<string, number>, outcomeCount: number, aicTotal: number, findingCount: number, operationalValueCount: number }} */ (item)),
            (item) => /** @type {{ key: string }} */ (item).key
          )
          : h('tr', null, h('td', { colSpan: 11 }, 'No workflows available.'))
      )
    )
  );
}

/**
 * @param {Map<string, LogicalSourceInput>} pageSources
 * @returns {HTMLElement}
 */
function renderFindingsPage(pageSources) {
  const findingsSource = pageSources.get('findings');
  const findings = Array.isArray(findingsSource?.rows) ? findingsSource.rows : [];

  const severityCounts = countBy(findings, 'finding-severity');
  const statusCounts = countBy(findings, 'finding-status');
  const items = findings.map((finding, index) => ({
    key: getFindingKey(finding, index),
    finding
  }));

  return h(
    'div',
    { className: 'findings-page' },
    h('h3', null, 'Finding Severity Counts'),
    renderSummaryList('finding-severity-counts', severityCounts),
    h('h3', null, 'Finding Status Counts'),
    renderSummaryList('finding-status-counts', statusCounts),
    h('h3', null, 'Findings'),
    h(
      'table',
      { className: 'findings-table' },
      h(
        'thead',
        null,
        h(
          'tr',
          null,
          h('th', null, 'Summary'),
          h('th', null, 'Severity'),
          h('th', null, 'Status'),
          h('th', null, 'Organization'),
          h('th', null, 'Repository'),
          h('th', null, 'Workflow'),
          h('th', null, 'Observed At'),
          h('th', null, 'Issue Link'),
          h('th', null, 'Pull Request Link'),
          h('th', null, 'Run Link')
        )
      ),
      h(
        'tbody',
        null,
        items.length > 0
          ? keyed(
            items,
            (item) => renderFindingRow(/** @type {{ key: string, finding: Record<string, unknown> }} */ (item)),
            (item) => /** @type {{ key: string }} */ (item).key
          )
          : h('tr', null, h('td', { colSpan: 10 }, 'No findings available.'))
      )
    )
  );
}

/**
 * @param {{ key: string, workflow: Record<string, unknown>, runCount: number, conclusionCounts: Map<string, number>, outcomeCount: number, aicTotal: number, findingCount: number, operationalValueCount: number }} item
 * @returns {HTMLElement}
 */
function renderWorkflowRow(item) {
  const workflow = item.workflow;

  return h(
    'tr',
    { 'data-workflow-id': String(workflow.workflow ?? item.key) },
    h('td', null, toText(workflow.workflow)),
    h('td', null, toText(workflow.organization)),
    h('td', null, toText(workflow.repository)),
    h('td', null, toText(workflow['workflow-active'])),
    h('td', null, toText(workflow['rollout-mode'])),
    h('td', null, String(item.runCount)),
    h('td', null, formatCounts(item.conclusionCounts)),
    h('td', null, String(item.outcomeCount)),
    h('td', null, formatNumber(item.aicTotal)),
    h('td', null, String(item.findingCount)),
    h('td', null, String(item.operationalValueCount))
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
 * @param {Array<Record<string, unknown>>} rows
 * @param {Record<string, unknown>} matchRow
 * @param {string} field
 * @returns {number}
 */
function countMatchingRows(rows, matchRow, field) {
  return rows.filter((row) => row[field] === matchRow[field]).length;
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {Record<string, unknown>} matchRow
 * @param {string} matchField
 * @param {string} countField
 * @returns {Map<string, number>}
 */
function countByMatchingRows(rows, matchRow, matchField, countField) {
  return countBy(rows.filter((row) => row[matchField] === matchRow[matchField]), countField);
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {Record<string, unknown>} matchRow
 * @param {string} matchField
 * @param {string} numericField
 * @returns {number}
 */
function sumMatchingNumericRows(rows, matchRow, matchField, numericField) {
  return rows.reduce((total, row) => {
    if (row[matchField] !== matchRow[matchField]) {
      return total;
    }
    return total + toNumber(row[numericField]);
  }, 0);
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
 * @param {Record<string, unknown>} workflow
 * @param {number} index
 * @returns {string}
 */
function getWorkflowKey(workflow, index) {
  return typeof workflow.workflow === 'string' && workflow.workflow.length > 0 ? workflow.workflow : `workflow-${index}`;
}

/**
 * @param {Record<string, unknown>} finding
 * @param {number} index
 * @returns {string}
 */
function getFindingKey(finding, index) {
  return typeof finding.finding === 'string' && finding.finding.length > 0 ? finding.finding : `finding-${index}`;
}

/**
 * @param {Record<string, unknown>} row
 * @returns {{ href: string, label: string } | null}
 */
function findRunLink(row) {
  return findLink(row, 'run-link');
}

/**
 * @param {Record<string, unknown>} row
 * @param {'issue-link'|'pull-request-link'|'run-link'|'external-link'|'evidence-link'} field
 * @returns {{ href: string, label: string } | null}
 */
function findLink(row, field) {
  const candidate = row[field];
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
 * @param {{ href: string, label: string } | null} link
 * @returns {string | HTMLElement}
 */
function renderLinkCell(link) {
  return link ? h('a', { href: link.href }, link.label) : 'Unavailable';
}

/**
 * @param {unknown} value
 * @returns {number}
 */
function toNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * @param {Map<string, number>} counts
 * @returns {string}
 */
function formatCounts(counts) {
  const entries = [...counts.entries()];
  return entries.length > 0
    ? entries.map(([name, count]) => `${name}: ${count}`).join(', ')
    : 'No data available.';
}

/**
 * @param {number} value
 * @returns {string}
 */
function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

/**
 * @param {{ key: string, finding: Record<string, unknown> }} item
 * @returns {HTMLElement}
 */
function renderFindingRow(item) {
  const finding = item.finding;
  const issueLink = findLink(finding, 'issue-link');
  const pullRequestLink = findLink(finding, 'pull-request-link');
  const runLink = findLink(finding, 'run-link');

  return h(
    'tr',
    { 'data-finding-id': String(finding.finding ?? item.key) },
    h('td', null, toText(finding['finding-summary'])),
    h('td', null, toText(finding['finding-severity'])),
    h('td', null, toText(finding['finding-status'])),
    h('td', null, toText(finding.organization)),
    h('td', null, toText(finding.repository)),
    h('td', null, toText(finding.workflow)),
    h('td', null, toText(finding['observed-at'])),
    h('td', null, renderLinkCell(issueLink)),
    h('td', null, renderLinkCell(pullRequestLink)),
    h('td', null, renderLinkCell(runLink))
  );
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
