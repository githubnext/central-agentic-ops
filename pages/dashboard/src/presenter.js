/**
 * Presenter for built-in and custom dashboard pages using GitHub Primer styling and elements.
 */

import { h, keyed } from './dom.js';
import { getPrimerStyles } from './styles.js';
import { octicon, agenticWorkflowMark } from './octicons.js';
import { renderStatusBadge, renderModeBadge, renderActiveStateBadge } from './components/badge.js';
import { renderDataStateMetrics } from './components/data-state.js';
import { renderTableRegion } from './components/table-region.js';
import { renderContextList, renderPageSection, renderProvenanceSection, renderTitledRegion, renderViewHeader } from './components/view-chrome.js';

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
  const description = document.dashboard.description;
  const pages = document.dashboard.pages;
  const orgName = inferOrganizationName(sources) || 'GitHub';

  const styleEl = h('style', null, getPrimerStyles());
  const skipLink = h('a', { href: '#main-content', className: 'skip-link' }, 'Skip to main content');

  const sidebar = renderSidebar(document, pages, orgName);
  const mainContent = renderMainContent(document, title, description, pages, sources, orgName);

  return h(
    'div',
    { className: 'dashboard-root' },
    styleEl,
    skipLink,
    h(
      'div',
      { className: 'app-shell' },
      sidebar,
      mainContent
    )
  );
}

/**
 * @param {Record<string, LogicalSourceInput>} sources
 * @returns {string | null}
 */
function inferOrganizationName(sources) {
  for (const source of Object.values(sources)) {
    if (Array.isArray(source?.rows)) {
      for (const row of source.rows) {
        if (typeof row?.organization === 'string' && row.organization.length > 0) {
          return row.organization;
        }
      }
    }
  }
  return null;
}

/**
 * @param {PresentationDocument} document
 * @param {Array<PresentableBuiltInPage | PresentableCustomPage>} pages
 * @param {string} orgName
 * @returns {HTMLElement}
 */
function renderSidebar(document, pages, orgName) {
  return h(
    'aside',
    { className: 'org-sidebar', role: 'region', 'aria-label': 'Organization navigation' },
    h(
      'div',
      { className: 'brand' },
      h('div', { className: 'brand-mark' }, agenticWorkflowMark()),
      h(
        'div',
        { className: 'brand-meta' },
        h('span', { className: 'brand-title' }, document.dashboard.title),
        h('span', { className: 'brand-org' }, orgName)
      )
    ),
    h(
      'nav',
      { className: 'primary-nav', 'aria-label': 'Primary navigation' },
      pages.map((page, index) => renderNavItem(page, index === 0))
    ),
    h(
      'div',
      { className: 'sidebar-footer' },
      `CAO Dashboard • Lang v${document.languageVersion}`
    )
  );
}

/**
 * @param {PresentableBuiltInPage | PresentableCustomPage} page
 * @param {boolean} isActive
 * @returns {HTMLElement}
 */
function renderNavItem(page, isActive) {
  const iconName = getPageIcon(page);
  const title = typeof page.title === 'string' && page.title.length > 0
    ? page.title
    : titleCase(page.id);

  return h(
    'a',
    {
      href: `#page-${page.id}`,
      className: `nav-item${isActive ? ' active' : ''}`,
      'aria-current': isActive ? 'page' : undefined,
      'data-nav-page-id': page.id
    },
    h('span', { className: 'nav-icon' }, octicon(iconName)),
    h('span', { className: 'nav-label' }, title)
  );
}

/**
 * @param {PresentableBuiltInPage | PresentableCustomPage} page
 * @returns {string}
 */
function getPageIcon(page) {
  if (page.kind === 'built-in') {
    if (page.page === 'workflows') return 'workflow';
    if (page.page === 'runs') return 'play';
    if (page.page === 'tasks') return 'issue';
    if (page.page === 'repositories') return 'repo';
  }
  const id = page.id.toLowerCase();
  if (id.includes('workflow')) return 'workflow';
  if (id.includes('run')) return 'play';
  if (id.includes('metric') || id.includes('usage')) return 'graph';
  if (id.includes('task') || id.includes('issue')) return 'issue';
  if (id.includes('repo')) return 'repo';
  if (id.includes('package')) return 'package';
  return 'server';
}

/**
 * @param {PresentationDocument} document
 * @param {string} title
 * @param {string | undefined} description
 * @param {Array<PresentableBuiltInPage | PresentableCustomPage>} pages
 * @param {Record<string, LogicalSourceInput>} sources
 * @param {string} orgName
 * @returns {HTMLElement}
 */
function renderMainContent(document, title, description, pages, sources, orgName) {
  return h(
    'div',
    { className: 'app-main' },
    h(
      'nav',
      { className: 'top-nav breadcrumb', 'aria-label': 'Breadcrumb' },
      h(
        'div',
        { className: 'shell' },
        h('a', { href: '#/' }, orgName),
        h('a', { href: '#/dashboard' }, title)
      )
    ),
    h(
      'main',
      { id: 'main-content', className: 'dashboard-prototype', tabIndex: -1 },
      h(
        'header',
        { className: 'overview-header', 'aria-labelledby': 'page-title' },
        h(
          'div',
          null,
          h('div', { className: 'title-area' }, h('h1', { id: 'page-title' }, title)),
          description ? h('p', { className: 'lede' }, description) : null
        )
      ),
      h(
        'div',
        { className: 'report-body' },
        h(
          'div',
          { className: 'dashboard-pages' },
          pages.map((page) => renderPage(page, sources))
        )
      ),
      h(
        'footer',
        { className: 'report-footer' },
        h('p', null, 'Generated by Central Agentic Ops • GitHub Primer Design System')
      )
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

  return renderCustomPage(page, title, sources);
}

/**
 * @param {PresentableCustomPage} page
 * @param {string} title
 * @param {Record<string, LogicalSourceInput>} sources
 * @returns {HTMLElement}
 */
function renderCustomPage(page, title, sources) {
  const views = Array.isArray(page.views) ? page.views : [];
  const renderedViews = views.map((view, index) => renderCustomView(page.id, view, index, sources));

  return h(
    'section',
    { className: 'dashboard-page', id: `page-${page.id}`, 'data-page-kind': 'custom', 'data-page-id': page.id },
    h('h2', null, title),
    ...(renderedViews.length > 0
      ? renderedViews
      : [h('p', null, 'No custom views available.')])
  );
}

/**
 * @param {string} pageId
 * @param {unknown} view
 * @param {number} index
 * @param {Record<string, LogicalSourceInput>} sources
 * @returns {HTMLElement}
 */
function renderCustomView(pageId, view, index, sources) {
  const fallbackTitle = `View ${index + 1}`;
  if (!isPlainObject(view)) {
    return renderCustomViewState(pageId, fallbackTitle, null, 'unavailable', ['Invalid custom view definition.']);
  }

  const title = typeof view.title === 'string' && view.title.length > 0
    ? view.title
    : typeof view.id === 'string' && view.id.length > 0
      ? titleCase(view.id)
      : fallbackTitle;

  const sourceName = getViewSource(view);
  if (!sourceName) {
    return renderCustomViewState(pageId, title, null, 'unavailable', ['Source unavailable.']);
  }

  const sourceInput = sources[sourceName];
  if (!sourceInput || !Array.isArray(sourceInput.rows)) {
    return renderCustomViewState(pageId, title, sourceName, 'unavailable', [`Source unavailable: ${sourceName}`]);
  }

  const state = sourceInput.metadata?.availability ?? inferAvailability(sourceInput.rows);
  const metadata = sourceInput.metadata;
  const contextDetails = [`Source: ${sourceName}`];
  if (isPlainObject(view.data?.scope) && Object.keys(view.data.scope).length > 0) {
    contextDetails.push(`Scope: ${JSON.stringify(view.data.scope)}`);
  }
  if (isPlainObject(view.data?.time) && Object.keys(view.data.time).length > 0) {
    contextDetails.push(`Time: ${JSON.stringify(view.data.time)}`);
  }
  if (isPlainObject(view.data?.filters) && Object.keys(view.data.filters).length > 0) {
    contextDetails.push(`Filters: ${JSON.stringify(view.data.filters)}`);
  }

  if (state !== 'available') {
    return renderCustomViewState(pageId, title, sourceName, state, contextDetails);
  }

  if (view.mark === 'metric') {
    return renderMetricView(pageId, title, view, sourceName, sourceInput.rows, metadata, contextDetails);
  }
  if (view.mark === 'table') {
    return renderTableView(pageId, title, view, sourceName, sourceInput.rows, metadata, contextDetails);
  }
  if (view.mark === 'chart') {
    return renderChartView(pageId, title, view, sourceName, sourceInput.rows, metadata, contextDetails);
  }

  return renderCustomViewState(pageId, title, sourceName, 'unavailable', [...contextDetails, 'Unsupported view mark.']);
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
    return {
      sourceName,
      sourceId: metadata['source-id'],
      sourceKind: metadata['source-kind'],
      asOf: metadata['as-of']
    };
  });

  const builtInBody = renderBuiltInPageBody(page, pageSources);

  return h(
    'section',
    { className: 'dashboard-page', id: `page-${page.id}`, 'data-page-kind': 'built-in', 'data-page-name': page.page, 'data-page-id': page.id },
    h('h2', null, title),
    renderDataStateMetrics(effectiveState),
    builtInBody,
    renderProvenanceSection(page.id, provenanceItems)
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

  if (page.page === 'usage') {
    return renderUsagePage(pageSources);
  }

  if (page.page === 'engines-models') {
    return renderEnginesModelsPage(pageSources);
  }

  if (page.page === 'operational-value') {
    return renderOperationalValuePage(pageSources);
  }

  if (page.page === 'organizations') {
    return renderOrganizationsPage(pageSources);
  }

  if (page.page === 'repositories') {
    return renderRepositoriesPage(pageSources);
  }

  if (page.page === 'experiments') {
    return renderExperimentsPage(pageSources);
  }

  if (page.page === 'graders') {
    return renderGradersPage(pageSources);
  }

  if (page.page === 'evals') {
    return renderEvalsPage(pageSources);
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
    renderPageSection('runs', 'Run Status Counts', [renderSummaryList('run-status-counts', statusCounts)]),
    renderPageSection('runs', 'Run Conclusion Counts', [renderSummaryList('run-conclusion-counts', conclusionCounts)]),
    renderPageSection('runs', 'Outcome Counts', [renderSummaryList('run-outcome-counts', outcomeCounts)]),
    renderPageSection('runs', 'Runs', [
      renderTableRegion({
        tableClassName: 'runs-table',
        emptyMessage: 'No runs available.',
        colSpan: 13,
        headCells: [
          'Run',
          'Status',
          'Conclusion',
          'Organization',
          'Repository',
          'Workflow',
          'Rollout Mode',
          'Engine',
          'Requested Model',
          'Resolved Model',
          'Started At',
          'Outcome Count',
          'Run Link'
        ],
        bodyRows: items.length > 0
          ? keyed(
            items,
            (item) => renderRunRow(/** @type {{ key: string, run: Record<string, unknown>, outcomeCount: number }} */ (item)),
            (item) => /** @type {{ key: string }} */ (item).key
          )
          : []
      })
    ])
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
    h('td', null, renderStatusBadge(run['run-status'])),
    h('td', null, renderStatusBadge(run['run-conclusion'])),
    h('td', null, toText(run.organization)),
    h('td', null, toText(run.repository)),
    h('td', null, toText(run.workflow)),
    h('td', null, renderModeBadge(run['rollout-mode'])),
    h('td', null, toText(run.engine)),
    h('td', null, toText(run['requested-model'])),
    h('td', null, toText(run['resolved-model'])),
    h('td', null, toText(run['started-at'])),
    h('td', null, String(item.outcomeCount)),
    h(
      'td',
      null,
      runLink
        ? renderExternalLink(runLink)
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
    renderTitledRegion('workflows', 'Workflow Inventory', renderTableRegion({
      tableClassName: 'workflows-table',
      emptyMessage: 'No workflows available.',
      colSpan: 11,
      headCells: [
        'Workflow',
        'Organization',
        'Repository',
        'Active State',
        'Rollout Mode',
        'Run Count',
        'Run Conclusions',
        'Outcome Count',
        'Available AIC',
        'Finding Count',
        'Operational Value Count'
      ],
      bodyRows: workflowItems.length > 0
        ? keyed(
          workflowItems,
          (item) => renderWorkflowRow(/** @type {{ key: string, workflow: Record<string, unknown>, runCount: number, conclusionCounts: Map<string, number>, outcomeCount: number, aicTotal: number, findingCount: number, operationalValueCount: number }} */ (item)),
          (item) => /** @type {{ key: string }} */ (item).key
        )
        : []
    }))
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
    renderPageSection('findings', 'Finding Severity Counts', [renderSummaryList('finding-severity-counts', severityCounts)]),
    renderPageSection('findings', 'Finding Status Counts', [renderSummaryList('finding-status-counts', statusCounts)]),
    renderPageSection('findings', 'Findings', [
      renderTableRegion({
        tableClassName: 'findings-table',
        emptyMessage: 'No findings available.',
        colSpan: 10,
        headCells: [
          'Summary',
          'Severity',
          'Status',
          'Organization',
          'Repository',
          'Workflow',
          'Observed At',
          'Issue Link',
          'Pull Request Link',
          'Run Link'
        ],
        bodyRows: items.length > 0
          ? keyed(
            items,
            (item) => renderFindingRow(/** @type {{ key: string, finding: Record<string, unknown> }} */ (item)),
            (item) => /** @type {{ key: string }} */ (item).key
          )
          : []
      })
    ])
  );
}

/**
 * @param {Map<string, LogicalSourceInput>} pageSources
 * @returns {HTMLElement}
 */
function renderUsagePage(pageSources) {
  const usageSource = pageSources.get('usage');
  const usageRows = Array.isArray(usageSource?.rows) ? usageSource.rows : [];
  const totals = summarizeUsageMeasures(usageRows);
  const items = usageRows.map((row, index) => ({
    key: getUsageKey(row, index),
    row
  }));

  return h(
    'div',
    { className: 'usage-page' },
    renderTitledRegion('usage', 'Usage Totals', renderSummaryList('usage-totals', totals)),
    renderTitledRegion('usage', 'Usage Observations', renderTableRegion({
      tableClassName: 'usage-table',
      emptyMessage: 'No usage observations available.',
      colSpan: 15,
      headCells: [
        'Organization',
        'Repository',
        'Workflow',
        'Run',
        'Engine',
        'Requested Model',
        'Resolved Model',
        'Rollout Mode',
        'Observed At',
        'Input Tokens',
        'Output Tokens',
        'Cache Read Tokens',
        'Cache Write Tokens',
        'Reasoning Tokens',
        'AIC'
      ],
      bodyRows: items.length > 0
        ? keyed(
          items,
          (item) => renderUsageRow(/** @type {{ key: string, row: Record<string, unknown> }} */ (item)),
          (item) => /** @type {{ key: string }} */ (item).key
        )
        : []
    }))
  );
}

/**
 * @param {Map<string, LogicalSourceInput>} pageSources
 * @returns {HTMLElement}
 */
function renderEnginesModelsPage(pageSources) {
  const runsSource = pageSources.get('runs');
  const outcomesSource = pageSources.get('outcomes');
  const usageSource = pageSources.get('usage');

  const runs = Array.isArray(runsSource?.rows) ? runsSource.rows : [];
  const outcomes = Array.isArray(outcomesSource?.rows) ? outcomesSource.rows : [];
  const usageRows = Array.isArray(usageSource?.rows) ? usageSource.rows : [];

  const items = groupEngineModelRows(runs, outcomes, usageRows);

  return h(
    'div',
    { className: 'engines-models-page' },
    renderTitledRegion('engines-models', 'Engine and Model Inventory', renderTableRegion({
      tableClassName: 'engines-models-table',
      emptyMessage: 'No engine or model observations available.',
      colSpan: 12,
      headCells: [
        'Engine',
        'Requested Model',
        'Resolved Model',
        'Run Count',
        'Run Conclusions',
        'Outcome Count',
        'Input Tokens',
        'Output Tokens',
        'Cache Read Tokens',
        'Cache Write Tokens',
        'Reasoning Tokens',
        'AIC'
      ],
      bodyRows: items.length > 0
        ? keyed(
          items,
          (item) => renderEngineModelRow(/** @type {{ key: string, engine: string, requestedModel: string, resolvedModel: string, runCount: number, conclusionCounts: Map<string, number>, outcomeCount: number, usageTotals: Map<string, number> }} */ (item)),
          (item) => /** @type {{ key: string }} */ (item).key
        )
        : []
    }))
  );
}

/**
 * @param {Map<string, LogicalSourceInput>} pageSources
 * @returns {HTMLElement}
 */
function renderOperationalValuePage(pageSources) {
  const operationalValuesSource = pageSources.get('operational-values');
  const rows = Array.isArray(operationalValuesSource?.rows) ? operationalValuesSource.rows : [];
  const items = [...rows]
    .map((row, index) => ({ key: getOperationalValueKey(row, index), row }))
    .sort((left, right) => compareObservedAt(left.row, right.row));

  return h(
    'div',
    { className: 'operational-value-page' },
    renderTitledRegion('operational-value', 'Operational Value Timeline', renderTableRegion({
      tableClassName: 'operational-value-table',
      emptyMessage: 'No operational value observations available.',
      colSpan: 16,
      headCells: [
        'Observed At',
        'Operational Value',
        'Definition',
        'Operational Case',
        'Evaluator Digest',
        'Organization',
        'Repository',
        'Workflow',
        'Run',
        'Experiment',
        'Requested Evidence At',
        'Evidence Cutoff',
        'Maturity At',
        'Maturity Status',
        'Delta From Baseline',
        'Evidence Link'
      ],
      bodyRows: items.length > 0
        ? keyed(
          items,
          (item) => renderOperationalValueRow(/** @type {{ key: string, row: Record<string, unknown> }} */ (item)),
          (item) => /** @type {{ key: string }} */ (item).key
        )
        : []
    }))
  );
}

/**
 * @param {Map<string, LogicalSourceInput>} pageSources
 * @returns {HTMLElement}
 */
function renderOrganizationsPage(pageSources) {
  const organizationsSource = pageSources.get('organizations');
  const repositoriesSource = pageSources.get('repositories');
  const workflowsSource = pageSources.get('workflows');
  const runsSource = pageSources.get('runs');
  const usageSource = pageSources.get('usage');

  const organizations = Array.isArray(organizationsSource?.rows) ? organizationsSource.rows : [];
  const repositories = Array.isArray(repositoriesSource?.rows) ? repositoriesSource.rows : [];
  const workflows = Array.isArray(workflowsSource?.rows) ? workflowsSource.rows : [];
  const runs = Array.isArray(runsSource?.rows) ? runsSource.rows : [];
  const usageRows = Array.isArray(usageSource?.rows) ? usageSource.rows : [];

  const items = organizations.map((organization, index) => ({
    key: getOrganizationKey(organization, index),
    organization,
    repositoryCount: countDistinctMatchingRows(repositories, organization, 'organization', 'repository'),
    workflowCount: countDistinctMatchingRows(workflows, organization, 'organization', 'workflow'),
    runCount: countDistinctMatchingRows(runs, organization, 'organization', 'run'),
    usageTotals: summarizeUsageMeasures(usageRows.filter((row) => row.organization === organization.organization))
  }));

  return h(
    'div',
    { className: 'organizations-page' },
    renderTitledRegion('organizations', 'Organization Inventory', renderTableRegion({
      tableClassName: 'organizations-table',
      emptyMessage: 'No organizations available.',
      colSpan: 11,
      headCells: [
        'Organization',
        'Organization Name',
        'Repository Count',
        'Workflow Count',
        'Run Count',
        'Input Tokens',
        'Output Tokens',
        'Cache Read Tokens',
        'Cache Write Tokens',
        'Reasoning Tokens',
        'AIC'
      ],
      bodyRows: items.length > 0
        ? keyed(
          items,
          (item) => renderOrganizationRow(/** @type {{ key: string, organization: Record<string, unknown>, repositoryCount: number, workflowCount: number, runCount: number, usageTotals: Map<string, number> }} */ (item)),
          (item) => /** @type {{ key: string }} */ (item).key
        )
        : []
    }))
  );
}

/**
 * @param {Map<string, LogicalSourceInput>} pageSources
 * @returns {HTMLElement}
 */
function renderRepositoriesPage(pageSources) {
  const repositoriesSource = pageSources.get('repositories');
  const runsSource = pageSources.get('runs');
  const usageSource = pageSources.get('usage');
  const operationalValuesSource = pageSources.get('operational-values');

  const repositories = Array.isArray(repositoriesSource?.rows) ? repositoriesSource.rows : [];
  const runs = Array.isArray(runsSource?.rows) ? runsSource.rows : [];
  const usageRows = Array.isArray(usageSource?.rows) ? usageSource.rows : [];
  const operationalValues = Array.isArray(operationalValuesSource?.rows) ? operationalValuesSource.rows : [];

  const items = repositories.map((repository, index) => ({
    key: getRepositoryKey(repository, index),
    repository,
    runCount: countDistinctMatchingRows(runs, repository, 'repository', 'run'),
    usageTotals: summarizeUsageMeasures(usageRows.filter((row) => row.repository === repository.repository)),
    operationalValueDefinitions: summarizeRepositoryOperationalValues(operationalValues, repository)
  }));

  items.sort((left, right) => compareRepositoryItems(left, right));

  return h(
    'div',
    { className: 'repositories-page' },
    renderTitledRegion('repositories', 'Repository Inventory and Rankings', renderTableRegion({
      tableClassName: 'repositories-table',
      emptyMessage: 'No repositories available.',
      colSpan: 7,
      headCells: [
        'Repository',
        'Repository Name',
        'Organization',
        'Rollout Mode',
        'Run Count',
        'AIC',
        'Operational Value by Definition'
      ],
      bodyRows: items.length > 0
        ? keyed(
          items,
          (item) => renderRepositoryRow(/** @type {{ key: string, repository: Record<string, unknown>, runCount: number, usageTotals: Map<string, number>, operationalValueDefinitions: Map<string, Array<number>> }} */ (item)),
          (item) => /** @type {{ key: string }} */ (item).key
        )
        : []
    }))
  );
}

/**
 * @param {Map<string, LogicalSourceInput>} pageSources
 * @returns {HTMLElement}
 */
function renderExperimentsPage(pageSources) {
  const experimentsSource = pageSources.get('experiments');
  const assignmentsSource = pageSources.get('experiment-assignments');
  const graderObservationsSource = pageSources.get('grader-observations');
  const evalObservationsSource = pageSources.get('eval-observations');
  const outcomesSource = pageSources.get('outcomes');
  const usageSource = pageSources.get('usage');
  const operationalValuesSource = pageSources.get('operational-values');

  const experiments = Array.isArray(experimentsSource?.rows) ? experimentsSource.rows : [];
  const assignments = Array.isArray(assignmentsSource?.rows) ? assignmentsSource.rows : [];
  const graderObservations = Array.isArray(graderObservationsSource?.rows) ? graderObservationsSource.rows : [];
  const evalObservations = Array.isArray(evalObservationsSource?.rows) ? evalObservationsSource.rows : [];
  const outcomes = Array.isArray(outcomesSource?.rows) ? outcomesSource.rows : [];
  const usageRows = Array.isArray(usageSource?.rows) ? usageSource.rows : [];
  const operationalValues = Array.isArray(operationalValuesSource?.rows) ? operationalValuesSource.rows : [];

  const items = experiments.map((experiment, index) => ({
    key: getExperimentKey(experiment, index),
    experiment,
    variantAssignments: summarizeVariantAssignments(assignments, experiment),
    graderStatusCounts: countByMatchingRows(graderObservations, experiment, 'experiment', 'status'),
    evalResultCounts: countByMatchingRows(evalObservations, experiment, 'experiment', 'eval-result'),
    outcomeCounts: countOutcomesForExperiment(assignments, outcomes, experiment),
    usageTotals: summarizeUsageMeasures(usageRows.filter((row) => row.experiment === experiment.experiment)),
    operationalValueDefinitions: summarizeExperimentOperationalValues(operationalValues, experiment)
  }));

  items.sort((left, right) => left.key.localeCompare(right.key));

  return h(
    'div',
    { className: 'experiments-page' },
    renderPageSection('experiments', 'Experiment Definitions and Observed Associations', [
      h(
        'p',
        { className: 'page-note' },
        'Observed assignments, grader observations, eval observations, outcomes, usage, and operational value are presented together without implying causation.'
      ),
      renderTableRegion({
        tableClassName: 'experiments-table',
        emptyMessage: 'No experiments available.',
        colSpan: 8,
        headCells: [
          'Experiment',
          'Experiment Name',
          'Observed Variants by Run Count',
          'Grader Observations',
          'Eval Observations',
          'Outcome Observations',
          'Usage AIC',
          'Operational Value by Definition'
        ],
        bodyRows: items.length > 0
          ? keyed(
            items,
            (item) => renderExperimentRow(/** @type {{ key: string, experiment: Record<string, unknown>, variantAssignments: Map<string, number>, graderStatusCounts: Map<string, number>, evalResultCounts: Map<string, number>, outcomeCounts: Map<string, number>, usageTotals: Map<string, number>, operationalValueDefinitions: Map<string, Array<number>> }} */ (item)),
            (item) => /** @type {{ key: string }} */ (item).key
          )
          : []
      })
    ])
  );
}

/**
 * @param {Map<string, LogicalSourceInput>} pageSources
 * @returns {HTMLElement}
 */
function renderGradersPage(pageSources) {
  const gradersSource = pageSources.get('graders');
  const graderObservationsSource = pageSources.get('grader-observations');
  const graders = Array.isArray(gradersSource?.rows) ? gradersSource.rows : [];
  const observations = Array.isArray(graderObservationsSource?.rows) ? graderObservationsSource.rows : [];

  const items = graders.map((grader, index) => ({
    key: getGraderKey(grader, index),
    grader,
    observationCount: countMatchingRows(observations, grader, 'grader'),
    statusCounts: countByMatchingRows(observations, grader, 'grader', 'status'),
    latestObservedAt: getLatestMatchingValue(observations, grader, 'grader', 'observed-at'),
    subjects: summarizeSubjects(observations, grader, 'grader'),
    scoreValues: summarizeScoreValues(observations, grader, 'grader')
  }));

  items.sort((left, right) => left.key.localeCompare(right.key));

  return h(
    'div',
    { className: 'graders-page' },
    renderTitledRegion('graders', 'Grader Definitions', renderTableRegion({
      tableClassName: 'graders-definitions-table',
      emptyMessage: 'No grader definitions available.',
      colSpan: 8,
      headCells: [
        'Grader',
        'Grader Name',
        'Definition Observed At',
        'Observation Count',
        'Observed Subjects',
        'Results',
        'Scores When Present',
        'Latest Observation Time'
      ],
      bodyRows: items.length > 0
        ? keyed(
          items,
          (item) => renderGraderDefinitionRow(/** @type {{ key: string, grader: Record<string, unknown>, observationCount: number, statusCounts: Map<string, number>, latestObservedAt: string, subjects: string[], scoreValues: string[] }} */ (item)),
          (item) => /** @type {{ key: string }} */ (item).key
        )
        : []
    })),
    renderTitledRegion('graders', 'Grader Observations', renderTableRegion({
      tableClassName: 'grader-observations-table',
      emptyMessage: 'No grader observations available.',
      colSpan: 6,
      headCells: [
        'Grader',
        'Observed Subject',
        'Run',
        'Result',
        'Score',
        'Time'
      ],
      bodyRows: observations.length > 0
        ? keyed(
          observations
            .map((observation, index) => ({ key: getGraderObservationKey(observation, index), observation }))
            .sort((left, right) => left.key.localeCompare(right.key)),
          (item) => renderGraderObservationRow(/** @type {{ key: string, observation: Record<string, unknown> }} */ (item)),
          (item) => /** @type {{ key: string }} */ (item).key
        )
        : []
    }))
  );
}

/**
 * @param {Map<string, LogicalSourceInput>} pageSources
 * @returns {HTMLElement}
 */
function renderEvalsPage(pageSources) {
  const evalsSource = pageSources.get('evals');
  const evalObservationsSource = pageSources.get('eval-observations');
  const evals = Array.isArray(evalsSource?.rows) ? evalsSource.rows : [];
  const observations = Array.isArray(evalObservationsSource?.rows) ? evalObservationsSource.rows : [];

  const items = evals.map((evaluation, index) => ({
    key: getEvalKey(evaluation, index),
    evaluation,
    observationCount: countMatchingRows(observations, evaluation, 'eval'),
    resultCounts: countByMatchingRows(observations, evaluation, 'eval', 'eval-result'),
    latestObservedAt: getLatestMatchingValue(observations, evaluation, 'eval', 'observed-at'),
    subjects: summarizeSubjects(observations, evaluation, 'eval'),
    models: summarizeObservationModels(observations, evaluation, 'eval')
  }));

  items.sort((left, right) => left.key.localeCompare(right.key));

  const observationItems = observations
    .map((observation, index) => ({ key: getEvalObservationKey(observation, index), observation }))
    .sort((left, right) => left.key.localeCompare(right.key));

  return h(
    'div',
    { className: 'evals-page' },
    renderPageSection('evals', 'Eval Definitions', [
      renderTableRegion({
        tableClassName: 'evals-definitions-table',
        emptyMessage: 'No eval definitions available.',
        colSpan: 10,
        headCells: [
          'Eval',
          'Eval Name',
          'Eval Question',
          'Requested Model',
          'Definition Observed At',
          'Observation Count',
          'Observed Subjects',
          'Results',
          'Evaluation Models When Available',
          'Latest Observation Time'
        ],
        bodyRows: items.length > 0
          ? keyed(
            items,
            (item) => renderEvalDefinitionRow(/** @type {{ key: string, evaluation: Record<string, unknown>, observationCount: number, resultCounts: Map<string, number>, latestObservedAt: string, subjects: string[], models: string[] }} */ (item)),
            (item) => /** @type {{ key: string }} */ (item).key
          )
          : []
      })
    ]),
    renderPageSection('evals', 'Eval Observations', [
      renderTableRegion({
        tableClassName: 'eval-observations-table',
        emptyMessage: 'No eval observations available.',
        colSpan: 7,
        headCells: [
          'Eval',
          'Observed Subject',
          'Run',
          'Result',
          'Requested Model',
          'Resolved Model',
          'Time'
        ],
        bodyRows: observationItems.length > 0
          ? keyed(
            observationItems,
            (item) => renderEvalObservationRow(/** @type {{ key: string, observation: Record<string, unknown> }} */ (item)),
            (item) => /** @type {{ key: string }} */ (item).key
          )
          : []
      })
    ])
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
    h('td', null, renderActiveStateBadge(workflow['workflow-active'])),
    h('td', null, renderModeBadge(workflow['rollout-mode'])),
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
 * @param {string} pageId
 * @param {string} title
 * @param {string | null} sourceName
 * @param {'available'|'empty'|'unavailable'} availability
 * @param {string[]} contextDetails
 * @returns {HTMLElement}
 */
function renderCustomViewState(pageId, title, sourceName, availability, contextDetails) {
  /** @type {HTMLElement[]} */
  const content = [
    h('p', { 'data-view-availability': availability }, availability === 'available'
      ? 'Data available.'
      : availability === 'empty'
        ? 'No observations matched the effective context.'
        : 'This view is unavailable.')
  ];
  if (sourceName) {
    content.push(h('p', { className: 'view-source' }, `Affected source: ${sourceName}`));
  }
  content.push(renderContextList(contextDetails));
  return renderPageSection(pageId, title, content);
}

/**
 * @param {string} pageId
 * @param {string} title
 * @param {Record<string, unknown>} view
 * @param {string} sourceName
 * @param {Array<Record<string, unknown>>} rows
 * @param {SourceMetadata} metadata
 * @param {string[]} contextDetails
 * @returns {HTMLElement}
 */
function renderMetricView(pageId, title, view, sourceName, rows, metadata, contextDetails) {
  const valueDefinition = isPlainObject(view.encoding) && isPlainObject(view.encoding.value)
    ? view.encoding.value
    : null;
  const fieldName = typeof valueDefinition?.field === 'string' ? valueDefinition.field : null;
  const aggregate = typeof valueDefinition?.aggregate === 'string' ? valueDefinition.aggregate : 'none';
  const hrefDefinition = isPlainObject(view.encoding) && isPlainObject(view.encoding.href)
    ? view.encoding.href
    : null;
  const hrefField = typeof hrefDefinition?.field === 'string' ? hrefDefinition.field : null;
  const link = hrefField ? findFirstAvailableLink(rows, /** @type {'external-link' | 'issue-link' | 'pull-request-link' | 'run-link' | 'evidence-link'} */ (hrefField)) : null;

  let valueText = 'Unavailable';
  if (fieldName) {
    if (aggregate === 'count') {
      valueText = String(rows.filter((row) => row[fieldName] != null && row[fieldName] !== '').length);
    } else if (aggregate === 'distinct-count') {
      valueText = String(new Set(rows.map((row) => toText(row[fieldName]))).size);
    } else if (aggregate === 'sum') {
      valueText = formatNumber(rows.reduce((total, row) => total + toNumber(row[fieldName]), 0));
    } else if (aggregate === 'mean') {
      const numericValues = rows.map((row) => toNumber(row[fieldName])).filter((value) => Number.isFinite(value));
      valueText = numericValues.length > 0
        ? formatNumber(numericValues.reduce((total, value) => total + value, 0) / numericValues.length)
        : 'Unavailable';
    } else if (aggregate === 'min') {
      const numericValues = rows.map((row) => toNumber(row[fieldName])).filter((value) => Number.isFinite(value));
      valueText = numericValues.length > 0 ? formatNumber(Math.min(...numericValues)) : 'Unavailable';
    } else if (aggregate === 'max') {
      const numericValues = rows.map((row) => toNumber(row[fieldName])).filter((value) => Number.isFinite(value));
      valueText = numericValues.length > 0 ? formatNumber(Math.max(...numericValues)) : 'Unavailable';
    } else {
      valueText = rows.length > 0 ? toText(rows[0][fieldName]) : 'Unavailable';
    }
  }

  /** @type {HTMLElement[]} */
  const content = [
    ...renderViewHeader(sourceName, metadata),
    h('p', { className: 'metric-value', 'data-metric-value': fieldName ?? 'unknown' }, valueText)
  ];
  if (link) {
    content.push(h('p', { className: 'metric-link' }, renderExternalLink(link)));
  }
  content.push(renderContextList(contextDetails));
  return renderPageSection(pageId, title, content);
}

/**
 * @param {string} pageId
 * @param {string} title
 * @param {Record<string, unknown>} view
 * @param {string} sourceName
 * @param {Array<Record<string, unknown>>} rows
 * @param {SourceMetadata} metadata
 * @param {string[]} contextDetails
 * @returns {HTMLElement}
 */
function renderTableView(pageId, title, view, sourceName, rows, metadata, contextDetails) {
  const columns = isPlainObject(view.encoding) && Array.isArray(view.encoding.columns)
    ? view.encoding.columns.filter((column) => isPlainObject(column) && typeof column.field === 'string')
    : [];
  const hrefDefinition = isPlainObject(view.encoding) && isPlainObject(view.encoding.href)
    ? view.encoding.href
    : null;
  const hrefField = typeof hrefDefinition?.field === 'string' ? hrefDefinition.field : null;

  return renderPageSection(pageId, title, [
    ...renderViewHeader(sourceName, metadata),
    renderTableRegion({
      tableClassName: 'custom-table',
      emptyMessage: 'No rows available.',
      colSpan: Math.max(columns.length, 1),
      headCells: columns.map((column) => fieldTitle(column)),
      bodyRows: rows.length > 0
        ? rows.map((row, rowIndex) => h(
          'tr',
          { 'data-custom-row-key': `${pageId}-${title}-${rowIndex}` },
          ...columns.map((column, columnIndex) => {
            const value = toText(row[column.field]);
            if (columnIndex === 0 && hrefField) {
              const link = findLink(row, /** @type {'external-link' | 'issue-link' | 'pull-request-link' | 'run-link' | 'evidence-link'} */ (hrefField));
              return h('td', null, link ? renderExternalLink(link) : value);
            }
            return h('td', null, value);
          })
        ))
        : []
    }),
    renderContextList(contextDetails)
  ]);
}

/**
 * @param {string} pageId
 * @param {string} title
 * @param {Record<string, unknown>} view
 * @param {string} sourceName
 * @param {Array<Record<string, unknown>>} rows
 * @param {SourceMetadata} metadata
 * @param {string[]} contextDetails
 * @returns {HTMLElement}
 */
function renderChartView(pageId, title, view, sourceName, rows, metadata, contextDetails) {
  const encoding = isPlainObject(view.encoding) ? view.encoding : null;
  const x = isPlainObject(encoding?.x) && typeof encoding.x.field === 'string' ? encoding.x : null;
  const y = isPlainObject(encoding?.y) && typeof encoding.y.field === 'string' ? encoding.y : null;
  const color = isPlainObject(encoding?.color) && typeof encoding.color.field === 'string' ? encoding.color : null;
  const chartDefault = x?.type === 'temporal' ? 'line' : 'bar';

  const points = rows.map((row, rowIndex) => ({
    key: `${pageId}-${title}-${rowIndex}`,
    x: x ? toText(row[x.field]) : 'unknown',
    y: y ? (typeof y.aggregate === 'string' && y.aggregate === 'count' ? '1' : toText(row[y.field])) : 'unknown',
    color: color ? toText(row[color.field]) : null
  }));
  const colorCategories = color
    ? [...new Set(points.map((point) => point.color ?? 'unknown'))].sort((left, right) => left.localeCompare(right))
    : [];

  return renderPageSection(pageId, title, [
    ...renderViewHeader(sourceName, metadata),
    h('p', { className: 'chart-default', 'data-chart-default': chartDefault }, `Default chart type: ${chartDefault}`),
    ...(color
      ? [h(
        'p',
        { className: 'chart-legend-text', 'data-chart-legend': 'text' },
        `Color categories: ${colorCategories.length > 0 ? colorCategories.join(', ') : 'unknown'}`
      )]
      : []),
    renderTableRegion({
      tableClassName: 'custom-chart-table',
      emptyMessage: 'No points available.',
      colSpan: color ? 3 : 2,
      headCells: [x ? fieldTitle(x) : 'X', y ? fieldTitle(y) : 'Y', ...(color ? [fieldTitle(color)] : [])],
      bodyRows: points.length > 0
        ? points.map((point) => h(
          'tr',
          { 'data-custom-point-key': point.key },
          h('td', null, point.x),
          h('td', null, point.y),
          color ? h('td', null, point.color ?? 'unknown') : null
        ))
        : []
    }),
    renderContextList(contextDetails)
  ]);
}

/**
 * @param {Record<string, unknown>} fieldDefinition
 * @returns {string}
 */
function fieldTitle(fieldDefinition) {
  if (typeof fieldDefinition.title === 'string' && fieldDefinition.title.length > 0) {
    return fieldDefinition.title;
  }
  return typeof fieldDefinition.field === 'string' ? titleCase(fieldDefinition.field) : 'Field';
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {'external-link' | 'issue-link' | 'pull-request-link' | 'run-link' | 'evidence-link'} field
 * @returns {{ href: string, label: string } | null}
 */
function findFirstAvailableLink(rows, field) {
  for (const row of rows) {
    const link = findLink(row, field);
    if (link) {
      return link;
    }
  }
  return null;
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
 * @param {string} distinctField
 * @returns {number}
 */
function countDistinctMatchingRows(rows, matchRow, matchField, distinctField) {
  const values = new Set();
  for (const row of rows) {
    if (row[matchField] === matchRow[matchField] && row[distinctField] != null && row[distinctField] !== '') {
      values.add(String(row[distinctField]));
    }
  }
  return values.size;
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
 * @param {Record<string, unknown>} usageRow
 * @param {number} index
 * @returns {string}
 */
function getUsageKey(usageRow, index) {
  if (typeof usageRow.invocation === 'string' && usageRow.invocation.length > 0) {
    return usageRow.invocation;
  }
  if (typeof usageRow.run === 'string' && usageRow.run.length > 0) {
    return `${usageRow.run}-${index}`;
  }
  return `usage-${index}`;
}

/**
 * @param {Record<string, unknown>} grader
 * @param {number} index
 * @returns {string}
 */
function getGraderKey(grader, index) {
  return typeof grader.grader === 'string' && grader.grader.length > 0 ? grader.grader : `grader-${index}`;
}

/**
 * @param {Record<string, unknown>} observation
 * @param {number} index
 * @returns {string}
 */
function getGraderObservationKey(observation, index) {
  if (typeof observation.grader === 'string' && typeof observation.run === 'string') {
    return `${observation.grader}-${observation.run}-${index}`;
  }
  return `grader-observation-${index}`;
}

/**
 * @param {Record<string, unknown>} evaluation
 * @param {number} index
 * @returns {string}
 */
function getEvalKey(evaluation, index) {
  return typeof evaluation.eval === 'string' && evaluation.eval.length > 0 ? evaluation.eval : `eval-${index}`;
}

/**
 * @param {Record<string, unknown>} observation
 * @param {number} index
 * @returns {string}
 */
function getEvalObservationKey(observation, index) {
  if (typeof observation.eval === 'string' && typeof observation.run === 'string') {
    return `${observation.eval}-${observation.run}-${index}`;
  }
  return `eval-observation-${index}`;
}

/**
 * @param {Record<string, unknown>} organization
 * @param {number} index
 * @returns {string}
 */
function getOrganizationKey(organization, index) {
  return typeof organization.organization === 'string' && organization.organization.length > 0
    ? organization.organization
    : `organization-${index}`;
}

/**
 * @param {Record<string, unknown>} repository
 * @param {number} index
 * @returns {string}
 */
function getRepositoryKey(repository, index) {
  return typeof repository.repository === 'string' && repository.repository.length > 0
    ? repository.repository
    : `repository-${index}`;
}

/**
 * @param {Record<string, unknown>} experiment
 * @param {number} index
 * @returns {string}
 */
function getExperimentKey(experiment, index) {
  return typeof experiment.experiment === 'string' && experiment.experiment.length > 0
    ? experiment.experiment
    : `experiment-${index}`;
}

/**
 * @param {Record<string, unknown>} operationalValueRow
 * @param {number} index
 * @returns {string}
 */
function getOperationalValueKey(operationalValueRow, index) {
  const definition = typeof operationalValueRow['operational-value-definition'] === 'string'
    ? operationalValueRow['operational-value-definition']
    : 'definition';
  const run = typeof operationalValueRow.run === 'string' ? operationalValueRow.run : `run-${index}`;
  const observedAt = typeof operationalValueRow['observed-at'] === 'string'
    ? operationalValueRow['observed-at']
    : `observed-${index}`;
  return `${definition}::${run}::${observedAt}`;
}

/**
 * @param {Array<Record<string, unknown>>} usageRows
 * @returns {Map<string, number>}
 */
function summarizeUsageMeasures(usageRows) {
  const usageMeasures = [
    'input-tokens',
    'output-tokens',
    'cache-read-tokens',
    'cache-write-tokens',
    'reasoning-tokens',
    'aic'
  ];

  /** @type {Map<string, number>} */
  const totals = new Map();
  for (const measure of usageMeasures) {
    totals.set(measure, usageRows.reduce((sum, row) => sum + toNumber(row[measure]), 0));
  }
  return totals;
}

/**
 * @param {Array<Record<string, unknown>>} runs
 * @param {Array<Record<string, unknown>>} outcomes
 * @param {Array<Record<string, unknown>>} usageRows
 * @returns {Array<{ key: string, engine: string, requestedModel: string, resolvedModel: string, runCount: number, conclusionCounts: Map<string, number>, outcomeCount: number, usageTotals: Map<string, number> }>}
 */
function groupEngineModelRows(runs, outcomes, usageRows) {
  /** @type {Map<string, { key: string, engine: string, requestedModel: string, resolvedModel: string, runIds: Set<string>, conclusionCounts: Map<string, number>, outcomeCount: number, usageRows: Array<Record<string, unknown>> }>} */
  const groups = new Map();

  for (const run of runs) {
    const key = getEngineModelGroupKey(run);
    const group = ensureEngineModelGroup(groups, key, run);
    const runId = typeof run.run === 'string' ? run.run : '';
    if (runId && !group.runIds.has(runId)) {
      group.runIds.add(runId);
      const conclusion = toText(run['run-conclusion']);
      group.conclusionCounts.set(conclusion, (group.conclusionCounts.get(conclusion) ?? 0) + 1);
      group.outcomeCount += countMatchingOutcomes(outcomes, run);
    }
  }

  for (const usageRow of usageRows) {
    const key = getEngineModelGroupKey(usageRow);
    const group = ensureEngineModelGroup(groups, key, usageRow);
    group.usageRows.push(usageRow);
  }

  return [...groups.values()]
    .map((group) => ({
      key: group.key,
      engine: group.engine,
      requestedModel: group.requestedModel,
      resolvedModel: group.resolvedModel,
      runCount: group.runIds.size,
      conclusionCounts: group.conclusionCounts,
      outcomeCount: group.outcomeCount,
      usageTotals: summarizeUsageMeasures(group.usageRows)
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

/**
 * @param {Map<string, { key: string, engine: string, requestedModel: string, resolvedModel: string, runIds: Set<string>, conclusionCounts: Map<string, number>, outcomeCount: number, usageRows: Array<Record<string, unknown>> }>} groups
 * @param {string} key
 * @param {Record<string, unknown>} row
 * @returns {{ key: string, engine: string, requestedModel: string, resolvedModel: string, runIds: Set<string>, conclusionCounts: Map<string, number>, outcomeCount: number, usageRows: Array<Record<string, unknown>> }}
 */
function ensureEngineModelGroup(groups, key, row) {
  const existing = groups.get(key);
  if (existing) {
    return existing;
  }

  const created = {
    key,
    engine: toText(row.engine),
    requestedModel: toText(row['requested-model']),
    resolvedModel: toText(row['resolved-model']),
    runIds: new Set(),
    conclusionCounts: new Map(),
    outcomeCount: 0,
    usageRows: []
  };
  groups.set(key, created);
  return created;
}

/**
 * @param {Record<string, unknown>} row
 * @returns {string}
 */
function getEngineModelGroupKey(row) {
  return [toText(row.engine), toText(row['requested-model']), toText(row['resolved-model'])].join('::');
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
  return link ? renderExternalLink(link) : 'Unavailable';
}

/**
 * @param {{ href: string, label: string }} link
 * @returns {HTMLElement}
 */
function renderExternalLink(link) {
  return h('a', {
    href: link.href,
    target: '_blank',
    rel: 'noopener noreferrer',
    'aria-label': link.label
  }, link.label);
}

/**
 * @param {HTMLElement} root
 */
export function enableDashboardKeyboardNavigation(root) {
  const sections = [...root.querySelectorAll('.dashboard-page .page-section')]
    .filter((section) => section instanceof HTMLElement);

  for (const [index, section] of sections.entries()) {
    section.addEventListener('keydown', (event) => {
      if (!(event instanceof KeyboardEvent)) {
        return;
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
        return;
      }
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      const nextSection = sections[index + delta];
      if (!nextSection) {
        return;
      }
      event.preventDefault();
      nextSection.focus();
    });
  }
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
 * @param {{ key: string, row: Record<string, unknown> }} item
 * @returns {HTMLElement}
 */
function renderUsageRow(item) {
  const usage = item.row;

  return h(
    'tr',
    { 'data-usage-key': item.key },
    h('td', null, toText(usage.organization)),
    h('td', null, toText(usage.repository)),
    h('td', null, toText(usage.workflow)),
    h('td', null, toText(usage.run)),
    h('td', null, toText(usage.engine)),
    h('td', null, toText(usage['requested-model'])),
    h('td', null, toText(usage['resolved-model'])),
    h('td', null, renderModeBadge(usage['rollout-mode'])),
    h('td', null, toText(usage['observed-at'])),
    h('td', null, formatNumber(toNumber(usage['input-tokens']))),
    h('td', null, formatNumber(toNumber(usage['output-tokens']))),
    h('td', null, formatNumber(toNumber(usage['cache-read-tokens']))),
    h('td', null, formatNumber(toNumber(usage['cache-write-tokens']))),
    h('td', null, formatNumber(toNumber(usage['reasoning-tokens']))),
    h('td', null, formatNumber(toNumber(usage.aic)))
  );
}

/**
 * @param {{ key: string, engine: string, requestedModel: string, resolvedModel: string, runCount: number, conclusionCounts: Map<string, number>, outcomeCount: number, usageTotals: Map<string, number> }} item
 * @returns {HTMLElement}
 */
function renderEngineModelRow(item) {
  return h(
    'tr',
    { 'data-engine-model-key': item.key },
    h('td', null, item.engine),
    h('td', null, item.requestedModel),
    h('td', null, item.resolvedModel),
    h('td', null, String(item.runCount)),
    h('td', null, formatCounts(item.conclusionCounts)),
    h('td', null, String(item.outcomeCount)),
    h('td', null, formatNumber(item.usageTotals.get('input-tokens') ?? 0)),
    h('td', null, formatNumber(item.usageTotals.get('output-tokens') ?? 0)),
    h('td', null, formatNumber(item.usageTotals.get('cache-read-tokens') ?? 0)),
    h('td', null, formatNumber(item.usageTotals.get('cache-write-tokens') ?? 0)),
    h('td', null, formatNumber(item.usageTotals.get('reasoning-tokens') ?? 0)),
    h('td', null, formatNumber(item.usageTotals.get('aic') ?? 0))
  );
}

/**
 * @param {{ key: string, row: Record<string, unknown> }} item
 * @returns {HTMLElement}
 */
function renderOperationalValueRow(item) {
  const row = item.row;
  const evidenceLink = findLink(row, 'evidence-link');

  return h(
    'tr',
    { 'data-operational-value-key': item.key },
    h('td', null, toText(row['observed-at'])),
    h('td', null, formatOperationalValue(row['operational-value'])),
    h('td', null, toText(row['operational-value-definition'])),
    h('td', null, toText(row['operational-case'])),
    h('td', null, toText(row['evaluator-digest'])),
    h('td', null, toText(row.organization)),
    h('td', null, toText(row.repository)),
    h('td', null, toText(row.workflow)),
    h('td', null, toText(row.run)),
    h('td', null, toText(row.experiment)),
    h('td', null, toText(row['requested-evidence-at'])),
    h('td', null, toText(row['evidence-cutoff'])),
    h('td', null, toText(row['maturity-at'])),
    h('td', null, toText(row['maturity-status'])),
    h('td', null, formatNullableNumber(row['delta-from-baseline'])),
    h('td', null, renderLinkCell(evidenceLink))
  );
}

/**
 * @param {{ key: string, organization: Record<string, unknown>, repositoryCount: number, workflowCount: number, runCount: number, usageTotals: Map<string, number> }} item
 * @returns {HTMLElement}
 */
function renderOrganizationRow(item) {
  const organization = item.organization;

  return h(
    'tr',
    { 'data-organization-id': String(organization.organization ?? item.key) },
    h('td', null, toText(organization.organization)),
    h('td', null, toText(organization['organization-name'])),
    h('td', null, String(item.repositoryCount)),
    h('td', null, String(item.workflowCount)),
    h('td', null, String(item.runCount)),
    h('td', null, formatNumber(item.usageTotals.get('input-tokens') ?? 0)),
    h('td', null, formatNumber(item.usageTotals.get('output-tokens') ?? 0)),
    h('td', null, formatNumber(item.usageTotals.get('cache-read-tokens') ?? 0)),
    h('td', null, formatNumber(item.usageTotals.get('cache-write-tokens') ?? 0)),
    h('td', null, formatNumber(item.usageTotals.get('reasoning-tokens') ?? 0)),
    h('td', null, formatNumber(item.usageTotals.get('aic') ?? 0))
  );
}

/**
 * @param {{ key: string, repository: Record<string, unknown>, runCount: number, usageTotals: Map<string, number>, operationalValueDefinitions: Map<string, Array<number>> }} item
 * @returns {HTMLElement}
 */
function renderRepositoryRow(item) {
  const repository = item.repository;

  return h(
    'tr',
    { 'data-repository-id': String(repository.repository ?? item.key) },
    h('td', null, toText(repository.repository)),
    h('td', null, toText(repository['repository-name'])),
    h('td', null, toText(repository.organization)),
    h('td', null, renderModeBadge(repository['rollout-mode'])),
    h('td', null, String(item.runCount)),
    h('td', null, formatNumber(item.usageTotals.get('aic') ?? 0)),
    h('td', null, formatOperationalValueDefinitions(item.operationalValueDefinitions))
  );
}

/**
 * @param {{ key: string, experiment: Record<string, unknown>, variantAssignments: Map<string, number>, graderStatusCounts: Map<string, number>, evalResultCounts: Map<string, number>, outcomeCounts: Map<string, number>, usageTotals: Map<string, number>, operationalValueDefinitions: Map<string, Array<number>> }} item
 * @returns {HTMLElement}
 */
function renderExperimentRow(item) {
  const experiment = item.experiment;

  return h(
    'tr',
    { 'data-experiment-id': String(experiment.experiment ?? item.key) },
    h('td', null, toText(experiment.experiment)),
    h('td', null, toText(experiment['experiment-name'])),
    h('td', null, formatCounts(item.variantAssignments)),
    h('td', null, formatCounts(item.graderStatusCounts)),
    h('td', null, formatCounts(item.evalResultCounts)),
    h('td', null, formatCounts(item.outcomeCounts)),
    h('td', null, formatNumber(item.usageTotals.get('aic') ?? 0)),
    h('td', null, formatOperationalValueDefinitions(item.operationalValueDefinitions))
  );
}

/**
 * @param {{ key: string, grader: Record<string, unknown>, observationCount: number, statusCounts: Map<string, number>, latestObservedAt: string, subjects: string[], scoreValues: string[] }} item
 * @returns {HTMLElement}
 */
function renderGraderDefinitionRow(item) {
  const grader = item.grader;

  return h(
    'tr',
    { 'data-grader-id': String(grader.grader ?? item.key) },
    h('td', null, toText(grader.grader)),
    h('td', null, toText(grader['grader-name'])),
    h('td', null, toText(grader['observed-at'])),
    h('td', null, String(item.observationCount)),
    h('td', null, item.subjects.length > 0 ? item.subjects.join(', ') : 'Unavailable'),
    h('td', null, formatCounts(item.statusCounts)),
    h('td', null, item.scoreValues.length > 0 ? item.scoreValues.join(', ') : 'Unavailable'),
    h('td', null, item.latestObservedAt)
  );
}

/**
 * @param {{ key: string, observation: Record<string, unknown> }} item
 * @returns {HTMLElement}
 */
function renderGraderObservationRow(item) {
  const observation = item.observation;

  return h(
    'tr',
    { 'data-grader-observation-key': item.key },
    h('td', null, toText(observation.grader)),
    h('td', null, getObservationSubject(observation)),
    h('td', null, toText(observation.run)),
    h('td', null, renderStatusBadge(observation.status)),
    h('td', null, formatNullableNumber(observation.value)),
    h('td', null, toText(observation['observed-at']))
  );
}

/**
 * @param {{ key: string, evaluation: Record<string, unknown>, observationCount: number, resultCounts: Map<string, number>, latestObservedAt: string, subjects: string[], models: string[] }} item
 * @returns {HTMLElement}
 */
function renderEvalDefinitionRow(item) {
  const evaluation = item.evaluation;

  return h(
    'tr',
    { 'data-eval-id': String(evaluation.eval ?? item.key) },
    h('td', null, toText(evaluation.eval)),
    h('td', null, toText(evaluation['eval-name'])),
    h('td', null, toText(evaluation['eval-question'])),
    h('td', null, toText(evaluation['requested-model'])),
    h('td', null, toText(evaluation['observed-at'])),
    h('td', null, String(item.observationCount)),
    h('td', null, item.subjects.length > 0 ? item.subjects.join(', ') : 'Unavailable'),
    h('td', null, formatCounts(item.resultCounts)),
    h('td', null, item.models.length > 0 ? item.models.join(', ') : 'Unavailable'),
    h('td', null, item.latestObservedAt)
  );
}

/**
 * @param {{ key: string, observation: Record<string, unknown> }} item
 * @returns {HTMLElement}
 */
function renderEvalObservationRow(item) {
  const observation = item.observation;

  return h(
    'tr',
    { 'data-eval-observation-key': item.key },
    h('td', null, toText(observation.eval)),
    h('td', null, getObservationSubject(observation)),
    h('td', null, toText(observation.run)),
    h('td', null, toText(observation['eval-result'])),
    h('td', null, toText(observation['requested-model'])),
    h('td', null, toText(observation['resolved-model'])),
    h('td', null, toText(observation['observed-at']))
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
 * @returns {string}
 */
function formatOperationalValue(value) {
  if (value === null) {
    return 'Unavailable';
  }
  return formatNullableNumber(value);
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {Record<string, unknown>} matchRow
 * @param {string} matchField
 * @param {string} valueField
 * @returns {string}
 */
function getLatestMatchingValue(rows, matchRow, matchField, valueField) {
  let latest = '';
  for (const row of rows) {
    if (row[matchField] !== matchRow[matchField]) {
      continue;
    }
    const value = toText(row[valueField]);
    if (value > latest) {
      latest = value;
    }
  }
  return latest || 'Unavailable';
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {Record<string, unknown>} matchRow
 * @param {string} matchField
 * @returns {string[]}
 */
function summarizeSubjects(rows, matchRow, matchField) {
  const subjects = new Set();
  for (const row of rows) {
    if (row[matchField] !== matchRow[matchField]) {
      continue;
    }
    subjects.add(getObservationSubject(row));
  }
  return [...subjects].sort();
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {Record<string, unknown>} matchRow
 * @param {string} matchField
 * @returns {string[]}
 */
function summarizeScoreValues(rows, matchRow, matchField) {
  const scores = [];
  for (const row of rows) {
    if (row[matchField] !== matchRow[matchField]) {
      continue;
    }
    if (row.value === null || row.value === undefined || row.value === '') {
      continue;
    }
    scores.push(formatNullableNumber(row.value));
  }
  return scores;
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {Record<string, unknown>} matchRow
 * @param {string} matchField
 * @returns {string[]}
 */
function summarizeObservationModels(rows, matchRow, matchField) {
  const models = new Set();
  for (const row of rows) {
    if (row[matchField] !== matchRow[matchField]) {
      continue;
    }
    const requested = typeof row['requested-model'] === 'string' && row['requested-model'].length > 0
      ? row['requested-model']
      : '';
    const resolved = typeof row['resolved-model'] === 'string' && row['resolved-model'].length > 0
      ? row['resolved-model']
      : '';
    const modelText = [requested, resolved].filter(Boolean).join(' → ');
    if (modelText) {
      models.add(modelText);
    }
  }
  return [...models].sort();
}

/**
 * @param {Record<string, unknown>} row
 * @returns {string}
 */
function getObservationSubject(row) {
  const subjectParts = [row.organization, row.repository, row.workflow].filter((value) => typeof value === 'string' && value.length > 0);
  const run = typeof row.run === 'string' && row.run.length > 0 ? `run ${row.run}` : '';
  const subject = [...subjectParts, run].filter(Boolean).join(' / ');
  return subject || 'Unavailable';
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function formatNullableNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? formatNumber(value)
    : 'Unavailable';
}

/**
 * @param {Record<string, unknown>} left
 * @param {Record<string, unknown>} right
 * @returns {number}
 */
function compareObservedAt(left, right) {
  const leftValue = typeof left['observed-at'] === 'string' ? Date.parse(left['observed-at']) : Number.NaN;
  const rightValue = typeof right['observed-at'] === 'string' ? Date.parse(right['observed-at']) : Number.NaN;

  if (Number.isNaN(leftValue) && Number.isNaN(rightValue)) {
    return 0;
  }
  if (Number.isNaN(leftValue)) {
    return 1;
  }
  if (Number.isNaN(rightValue)) {
    return -1;
  }
  return leftValue - rightValue;
}

/**
 * @param {Array<Record<string, unknown>>} operationalValues
 * @param {Record<string, unknown>} repository
 * @returns {Map<string, Array<number>>}
 */
function summarizeRepositoryOperationalValues(operationalValues, repository) {
  /** @type {Map<string, Array<number>>} */
  const byDefinition = new Map();

  for (const row of operationalValues) {
    if (row.repository !== repository.repository) {
      continue;
    }
    const definition = toText(row['operational-value-definition']);
    const value = row['operational-value'];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      continue;
    }
    const values = byDefinition.get(definition) ?? [];
    values.push(value);
    byDefinition.set(definition, values);
  }

  return byDefinition;
}

/**
 * @param {Array<Record<string, unknown>>} assignments
 * @param {Record<string, unknown>} experiment
 * @returns {Map<string, number>}
 */
function summarizeVariantAssignments(assignments, experiment) {
  return countBy(assignments.filter((row) => row.experiment === experiment.experiment), 'variant');
}

/**
 * @param {Array<Record<string, unknown>>} assignments
 * @param {Array<Record<string, unknown>>} outcomes
 * @param {Record<string, unknown>} experiment
 * @returns {Map<string, number>}
 */
function countOutcomesForExperiment(assignments, outcomes, experiment) {
  const runIds = new Set(
    assignments
      .filter((row) => row.experiment === experiment.experiment && typeof row.run === 'string' && row.run.length > 0)
      .map((row) => String(row.run))
  );
  return countBy(outcomes.filter((row) => typeof row.run === 'string' && runIds.has(row.run)), 'outcome-state');
}

/**
 * @param {Array<Record<string, unknown>>} operationalValues
 * @param {Record<string, unknown>} experiment
 * @returns {Map<string, Array<number>>}
 */
function summarizeExperimentOperationalValues(operationalValues, experiment) {
  /** @type {Map<string, Array<number>>} */
  const byDefinition = new Map();

  for (const row of operationalValues) {
    if (row.experiment !== experiment.experiment) {
      continue;
    }
    const definition = toText(row['operational-value-definition']);
    const value = row['operational-value'];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      continue;
    }
    const values = byDefinition.get(definition) ?? [];
    values.push(value);
    byDefinition.set(definition, values);
  }

  return byDefinition;
}

/**
 * @param {Map<string, Array<number>>} definitions
 * @returns {string}
 */
function formatOperationalValueDefinitions(definitions) {
  const entries = [...definitions.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([definition, values]) => `${definition}: ${values.map((value) => formatNumber(value)).join(', ')}`);
  return entries.length > 0 ? entries.join(' | ') : 'Unavailable';
}

/**
 * @param {{ key: string, repository: Record<string, unknown>, runCount: number, usageTotals: Map<string, number>, operationalValueDefinitions: Map<string, Array<number>> }} left
 * @param {{ key: string, repository: Record<string, unknown>, runCount: number, usageTotals: Map<string, number>, operationalValueDefinitions: Map<string, Array<number>> }} right
 * @returns {number}
 */
function compareRepositoryItems(left, right) {
  const runDelta = right.runCount - left.runCount;
  if (runDelta !== 0) {
    return runDelta;
  }

  const aicDelta = (right.usageTotals.get('aic') ?? 0) - (left.usageTotals.get('aic') ?? 0);
  if (aicDelta !== 0) {
    return aicDelta;
  }

  const valueDelta = summarizeOperationalValueMagnitude(right.operationalValueDefinitions) - summarizeOperationalValueMagnitude(left.operationalValueDefinitions);
  if (valueDelta !== 0) {
    return valueDelta;
  }

  return left.key.localeCompare(right.key);
}

/**
 * @param {Map<string, Array<number>>} definitions
 * @returns {number}
 */
function summarizeOperationalValueMagnitude(definitions) {
  let total = 0;
  for (const values of definitions.values()) {
    for (const value of values) {
      total += value;
    }
  }
  return total;
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, any>}
 */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
