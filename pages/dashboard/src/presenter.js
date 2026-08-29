/**
 * Presenter for built-in and custom dashboard pages using GitHub Primer styling and elements.
 */

import { h, keyed } from './dom.js';
import { getPrimerStyles } from './styles.js';
import { octicon, agenticWorkflowMark } from './octicons.js';
import { renderStatusBadge, renderModeBadge, renderActiveStateBadge } from './components/badge.js';
import { renderDataStateMetrics } from './components/data-state.js';

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
    { className: 'dashboard-page', id: `page-${page.id}`, 'data-page-kind': 'built-in', 'data-page-name': page.page, 'data-page-id': page.id },
    h('h2', null, title),
    renderDataStateMetrics(effectiveState),
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
      'div',
      { className: 'table-region' },
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
      'div',
      { className: 'table-region' },
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
      'div',
      { className: 'table-region' },
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
    )
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
    h('h3', null, 'Usage Totals'),
    renderSummaryList('usage-totals', totals),
    h('h3', null, 'Usage Observations'),
    h(
      'div',
      { className: 'table-region' },
      h(
        'table',
        { className: 'usage-table' },
        h(
          'thead',
          null,
          h(
            'tr',
            null,
            h('th', null, 'Organization'),
            h('th', null, 'Repository'),
            h('th', null, 'Workflow'),
            h('th', null, 'Run'),
            h('th', null, 'Engine'),
            h('th', null, 'Requested Model'),
            h('th', null, 'Resolved Model'),
            h('th', null, 'Rollout Mode'),
            h('th', null, 'Observed At'),
            h('th', null, 'Input Tokens'),
            h('th', null, 'Output Tokens'),
            h('th', null, 'Cache Read Tokens'),
            h('th', null, 'Cache Write Tokens'),
            h('th', null, 'Reasoning Tokens'),
            h('th', null, 'AIC')
          )
        ),
        h(
          'tbody',
          null,
          items.length > 0
            ? keyed(
              items,
              (item) => renderUsageRow(/** @type {{ key: string, row: Record<string, unknown> }} */ (item)),
              (item) => /** @type {{ key: string }} */ (item).key
            )
            : h('tr', null, h('td', { colSpan: 15 }, 'No usage observations available.'))
        )
      )
    )
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
    h('h3', null, 'Engine and Model Inventory'),
    h(
      'div',
      { className: 'table-region' },
      h(
        'table',
        { className: 'engines-models-table' },
        h(
          'thead',
          null,
          h(
            'tr',
            null,
            h('th', null, 'Engine'),
            h('th', null, 'Requested Model'),
            h('th', null, 'Resolved Model'),
            h('th', null, 'Run Count'),
            h('th', null, 'Run Conclusions'),
            h('th', null, 'Outcome Count'),
            h('th', null, 'Input Tokens'),
            h('th', null, 'Output Tokens'),
            h('th', null, 'Cache Read Tokens'),
            h('th', null, 'Cache Write Tokens'),
            h('th', null, 'Reasoning Tokens'),
            h('th', null, 'AIC')
          )
        ),
        h(
          'tbody',
          null,
          items.length > 0
            ? keyed(
              items,
              (item) => renderEngineModelRow(/** @type {{ key: string, engine: string, requestedModel: string, resolvedModel: string, runCount: number, conclusionCounts: Map<string, number>, outcomeCount: number, usageTotals: Map<string, number> }} */ (item)),
              (item) => /** @type {{ key: string }} */ (item).key
            )
            : h('tr', null, h('td', { colSpan: 12 }, 'No engine or model observations available.'))
        )
      )
    )
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
    h('h3', null, 'Operational Value Timeline'),
    h(
      'div',
      { className: 'table-region' },
      h(
        'table',
        { className: 'operational-value-table' },
        h(
          'thead',
          null,
          h(
            'tr',
            null,
            h('th', null, 'Observed At'),
            h('th', null, 'Operational Value'),
            h('th', null, 'Definition'),
            h('th', null, 'Operational Case'),
            h('th', null, 'Evaluator Digest'),
            h('th', null, 'Organization'),
            h('th', null, 'Repository'),
            h('th', null, 'Workflow'),
            h('th', null, 'Run'),
            h('th', null, 'Experiment'),
            h('th', null, 'Requested Evidence At'),
            h('th', null, 'Evidence Cutoff'),
            h('th', null, 'Maturity At'),
            h('th', null, 'Maturity Status'),
            h('th', null, 'Delta From Baseline'),
            h('th', null, 'Evidence Link')
          )
        ),
        h(
          'tbody',
          null,
          items.length > 0
            ? keyed(
              items,
              (item) => renderOperationalValueRow(/** @type {{ key: string, row: Record<string, unknown> }} */ (item)),
              (item) => /** @type {{ key: string }} */ (item).key
            )
            : h('tr', null, h('td', { colSpan: 16 }, 'No operational value observations available.'))
        )
      )
    )
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
    h('h3', null, 'Organization Inventory'),
    h(
      'div',
      { className: 'table-region' },
      h(
        'table',
        { className: 'organizations-table' },
        h(
          'thead',
          null,
          h(
            'tr',
            null,
            h('th', null, 'Organization'),
            h('th', null, 'Organization Name'),
            h('th', null, 'Repository Count'),
            h('th', null, 'Workflow Count'),
            h('th', null, 'Run Count'),
            h('th', null, 'Input Tokens'),
            h('th', null, 'Output Tokens'),
            h('th', null, 'Cache Read Tokens'),
            h('th', null, 'Cache Write Tokens'),
            h('th', null, 'Reasoning Tokens'),
            h('th', null, 'AIC')
          )
        ),
        h(
          'tbody',
          null,
          items.length > 0
            ? keyed(
              items,
              (item) => renderOrganizationRow(/** @type {{ key: string, organization: Record<string, unknown>, repositoryCount: number, workflowCount: number, runCount: number, usageTotals: Map<string, number> }} */ (item)),
              (item) => /** @type {{ key: string }} */ (item).key
            )
            : h('tr', null, h('td', { colSpan: 11 }, 'No organizations available.'))
        )
      )
    )
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
    h('h3', null, 'Repository Inventory and Rankings'),
    h(
      'div',
      { className: 'table-region' },
      h(
        'table',
        { className: 'repositories-table' },
        h(
          'thead',
          null,
          h(
            'tr',
            null,
            h('th', null, 'Repository'),
            h('th', null, 'Repository Name'),
            h('th', null, 'Organization'),
            h('th', null, 'Rollout Mode'),
            h('th', null, 'Run Count'),
            h('th', null, 'AIC'),
            h('th', null, 'Operational Value by Definition')
          )
        ),
        h(
          'tbody',
          null,
          items.length > 0
            ? keyed(
              items,
              (item) => renderRepositoryRow(/** @type {{ key: string, repository: Record<string, unknown>, runCount: number, usageTotals: Map<string, number>, operationalValueDefinitions: Map<string, Array<number>> }} */ (item)),
              (item) => /** @type {{ key: string }} */ (item).key
            )
            : h('tr', null, h('td', { colSpan: 7 }, 'No repositories available.'))
        )
      )
    )
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
    h('h3', null, 'Experiment Definitions and Observed Associations'),
    h(
      'p',
      { className: 'page-note' },
      'Observed assignments, grader observations, eval observations, outcomes, usage, and operational value are presented together without implying causation.'
    ),
    h(
      'div',
      { className: 'table-region' },
      h(
        'table',
        { className: 'experiments-table' },
        h(
          'thead',
          null,
          h(
            'tr',
            null,
            h('th', null, 'Experiment'),
            h('th', null, 'Experiment Name'),
            h('th', null, 'Observed Variants by Run Count'),
            h('th', null, 'Grader Observations'),
            h('th', null, 'Eval Observations'),
            h('th', null, 'Outcome Observations'),
            h('th', null, 'Usage AIC'),
            h('th', null, 'Operational Value by Definition')
          )
        ),
        h(
          'tbody',
          null,
          items.length > 0
            ? keyed(
              items,
              (item) => renderExperimentRow(/** @type {{ key: string, experiment: Record<string, unknown>, variantAssignments: Map<string, number>, graderStatusCounts: Map<string, number>, evalResultCounts: Map<string, number>, outcomeCounts: Map<string, number>, usageTotals: Map<string, number>, operationalValueDefinitions: Map<string, Array<number>> }} */ (item)),
              (item) => /** @type {{ key: string }} */ (item).key
            )
            : h('tr', null, h('td', { colSpan: 8 }, 'No experiments available.'))
        )
      )
    )
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
    h('h3', null, 'Grader Definitions'),
    h(
      'div',
      { className: 'table-region' },
      h(
        'table',
        { className: 'graders-definitions-table' },
        h(
          'thead',
          null,
          h(
            'tr',
            null,
            h('th', null, 'Grader'),
            h('th', null, 'Grader Name'),
            h('th', null, 'Definition Observed At'),
            h('th', null, 'Observation Count'),
            h('th', null, 'Observed Subjects'),
            h('th', null, 'Results'),
            h('th', null, 'Scores When Present'),
            h('th', null, 'Latest Observation Time')
          )
        ),
        h(
          'tbody',
          null,
          items.length > 0
            ? keyed(
              items,
              (item) => renderGraderDefinitionRow(/** @type {{ key: string, grader: Record<string, unknown>, observationCount: number, statusCounts: Map<string, number>, latestObservedAt: string, subjects: string[], scoreValues: string[] }} */ (item)),
              (item) => /** @type {{ key: string }} */ (item).key
            )
            : h('tr', null, h('td', { colSpan: 8 }, 'No grader definitions available.'))
        )
      )
    ),
    h('h3', null, 'Grader Observations'),
    h(
      'div',
      { className: 'table-region' },
      h(
        'table',
        { className: 'grader-observations-table' },
        h(
          'thead',
          null,
          h(
            'tr',
            null,
            h('th', null, 'Grader'),
            h('th', null, 'Observed Subject'),
            h('th', null, 'Run'),
            h('th', null, 'Result'),
            h('th', null, 'Score'),
            h('th', null, 'Time')
          )
        ),
        h(
          'tbody',
          null,
          observations.length > 0
            ? keyed(
              observations
                .map((observation, index) => ({ key: getGraderObservationKey(observation, index), observation }))
                .sort((left, right) => left.key.localeCompare(right.key)),
              (item) => renderGraderObservationRow(/** @type {{ key: string, observation: Record<string, unknown> }} */ (item)),
              (item) => /** @type {{ key: string }} */ (item).key
            )
            : h('tr', null, h('td', { colSpan: 6 }, 'No grader observations available.'))
        )
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
