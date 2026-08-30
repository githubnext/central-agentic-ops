/**
 * Presenter for JSON-driven dashboard pages using GitHub Primer styling and elements.
 */

import builtInDashboard from '../dashboard.json' with { type: 'json' };
import { h } from './dom.js';
import { getPrimerStyles } from './styles.js';
import { octicon, agenticWorkflowMark } from './octicons.js';
import { renderDataStateMetrics } from './components/data-state.js';
import { renderTableRegion } from './components/table-region.js';
import { renderContextChrome, renderPageSection, renderViewSectionChrome } from './components/view-chrome.js';
import { formatAggregateValue, formatNumber, toNumber } from './view-formatters.js';
import { renderActiveStateBadge, renderModeBadge, renderStatusBadge } from './components/badge.js';
import { renderOperationalOverview } from './components/operational-overview.js';

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
 * @typedef {{ id: string, title?: string, description?: string, layout: 'full'|'wide'|'narrow', views: string[] }} PresentablePageSection
 */

/**
 * @typedef {{ id: string, kind: 'built-in', page: string, title?: string, description?: string, definition?: { views?: Array<unknown>, sections?: PresentablePageSection[], ['data-state']?: Record<string, boolean> } }} PresentableBuiltInPage
 */

/**
 * @typedef {{ id: string, kind: 'custom', title?: string, description?: string, views: unknown[], sections?: PresentablePageSection[] }} PresentableCustomPage
 */

/**
 * @typedef {{ field: string, aggregate?: string, as?: string, direction?: string } & Record<string, unknown>} TableField
 */

/**
 * @typedef {{ languageVersion: string, dashboard: { id: string, title: string, description?: string, defaults?: Record<string, unknown>, pages: Array<PresentableBuiltInPage | PresentableCustomPage> } }} PresentationDocument
 */

/**
 * @typedef {{ document: PresentationDocument, sources: Record<string, LogicalSourceInput> }} PresentationInput
 */


/** @type {Record<string, PresentableCustomPage>} */
const BUILT_IN_PAGE_PAYLOADS = /** @type {Record<string, PresentableCustomPage>} */ (Object.fromEntries(
  builtInDashboard.dashboard.pages.map((page) => [
    page.page,
    {
      id: page.id,
      kind: 'custom',
      title: page.title,
      description: 'description' in page ? page.description : undefined,
      views: page.definition.views,
      sections: page.definition.sections
    }
  ])
));

/**
 * @param {PresentableBuiltInPage} page
 * @returns {PresentableCustomPage}
 */
function getBuiltInPagePayload(page) {
  const payload = BUILT_IN_PAGE_PAYLOADS[page.page];
  return {
    ...payload,
    id: page.id,
    kind: 'custom',
    title: page.title ?? payload?.title,
    description: page.description ?? payload?.description,
    views: payload?.views ?? [],
    sections: payload?.sections
  };
}

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

  const sidebar = renderSidebar(pages, orgName);
  const mainContent = renderMainContent(document, title, description, pages, sources, orgName);

  const root = h(
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
  enableDashboardPageNavigation(root);
  return root;
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
 * @param {Array<PresentableBuiltInPage | PresentableCustomPage>} pages
 * @param {string} orgName
 * @returns {HTMLElement}
 */
function renderSidebar(pages, orgName) {
  const firstPageId = pages[0]?.id;
  return h(
    'aside',
    { className: 'org-sidebar', 'aria-label': 'Central Agentic Ops navigation' },
    h(
      'a',
      { className: 'sidebar-brand', href: firstPageId ? `#page-${firstPageId}` : '#main-content' },
      agenticWorkflowMark(),
      h('span', null, orgName)
    ),
    h(
      'nav',
      { className: 'primary-nav', 'aria-label': 'Primary' },
      pages.map((page, index) => renderNavItem(page, index === 0))
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
    octicon(iconName),
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
  const latestRetrieval = latestRetrievedAt(sources);
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
        h('a', { href: '#/dashboard' }, title),
        latestRetrieval
          ? h(
            'div',
            { className: 'report-actions' },
            h('time', { className: 'freshness', dateTime: latestRetrieval }, `Last updated ${formatReportDate(latestRetrieval)}`)
          )
          : null
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
      )
    ),
    h(
      'footer',
      { className: 'report-footer' },
      'Generated deterministically from dashboard data.'
    )
  );
}

/**
 * @param {Record<string, LogicalSourceInput>} sources
 * @returns {string | null}
 */
function latestRetrievedAt(sources) {
  return Object.values(sources)
    .map((source) => source?.metadata?.['retrieved-at'])
    .filter((value) => typeof value === 'string' && Number.isFinite(Date.parse(value)))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null;
}

/**
 * @param {string} value
 * @returns {string}
 */
function formatReportDate(value) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC'
  }).format(new Date(value));
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
    const payload = getBuiltInPagePayload(page);
    return renderCustomPage(payload, title, sources, page.page === 'overview');
  }

  return renderCustomPage(page, title, sources, false);
}

/**
 * @param {PresentableCustomPage} page
 * @param {string} title
 * @param {Record<string, LogicalSourceInput>} sources
 * @param {boolean} useOperationalOverview
 * @returns {HTMLElement}
 */
function renderCustomPage(page, title, sources, useOperationalOverview) {
  const views = Array.isArray(page.views) ? page.views : [];
  const sections = Array.isArray(page.sections) ? page.sections : [];
  /** @type {Map<string, LogicalSourceInput>} */
  const pageSources = new Map();
  for (const view of views) {
    const sourceName = getViewSource(view);
    if (sourceName && sources[sourceName]) {
      pageSources.set(sourceName, sources[sourceName]);
    }

  }
  const renderedViews = views.map((view, index) => {
    const rendered = renderCustomView(page.id, view, index, sources, sections.length > 0 ? 'h4' : 'h3');
    const layout = isPlainObject(view) && typeof view.layout === 'string' ? view.layout : 'full';
    rendered.classList.add('custom-view');
    rendered.setAttribute('data-view-layout', layout);
    return rendered;
  });
  const renderedViewsById = new Map(views.map((view, index) => [
    isPlainObject(view) && typeof view.id === 'string' ? view.id : `view-${index + 1}`,
    renderedViews[index]
  ]));
  const renderedContent = useOperationalOverview && sections.length > 0
    ? renderOverviewContent(sections, renderedViewsById, sources)
    : sections.length > 0
    ? h(
      'div',
      { className: 'page-layout-grid' },
      ...sections.map((section) => renderLayoutSection(page.id, section, renderedViewsById))
    )
    : h('div', { className: 'custom-view-grid' }, ...renderedViews);

  return h(
    'section',
    {
      className: `dashboard-page ${page.id}-page`,
      id: `page-${page.id}`,
      'data-page-kind': 'custom',
      'data-page-name': page.id,
      'data-page-id': page.id
    },
    h('h2', { tabIndex: -1 }, title),
    page.description ? h('p', { className: 'page-description' }, page.description) : null,
    ...(renderedViews.length > 0
      ? useOperationalOverview
        ? [renderedContent, renderDataStateMetrics(summarizeDataState(pageSources))]
        : [renderDataStateMetrics(summarizeDataState(pageSources)), renderedContent]
      : [h('p', null, 'No custom views available.')])
  );
}

/**
 * @param {PresentablePageSection[]} sections
 * @param {Map<string, HTMLElement>} renderedViews
 * @param {Record<string, LogicalSourceInput>} sources
 * @returns {HTMLElement}
 */
function renderOverviewContent(sections, renderedViews, sources) {
  const trends = sections.find((section) => section.id === 'execution-trends');
  return h(
    'div',
    { className: 'overview-content' },
    renderOperationalOverview(sources),
    trends ? renderLayoutSection('overview', trends, renderedViews) : null
  );
}

/**
 * @param {string} pageId
 * @param {PresentablePageSection} section
 * @param {Map<string, HTMLElement>} renderedViews
 * @returns {HTMLElement}
 */
function renderLayoutSection(pageId, section, renderedViews) {
  const title = section.title ?? titleCase(section.id);
  const headingId = `${pageId}-${section.id}-layout-heading`;
  return h(
    'section',
    {
      className: 'layout-section',
      'data-section-id': section.id,
      'data-section-layout': section.layout,
      'aria-labelledby': headingId
    },
    h(
      'header',
      { className: 'layout-section-header' },
      h('h3', { id: headingId }, title),
      section.description ? h('p', null, section.description) : null
    ),
    h(
      'div',
      { className: 'custom-view-grid' },
      ...section.views.map((viewId) => renderedViews.get(viewId)
        ?? h('p', { className: 'empty', 'data-missing-view-id': viewId }, `View unavailable: ${viewId}`))
    )
  );
}

/**
 * Shows a single dashboard page and keeps sidebar state synchronized with the URL hash.
 * @param {HTMLElement} root
 */
export function enableDashboardPageNavigation(root) {
  const pages = [...root.querySelectorAll('.dashboard-page')]
    .filter((page) => page instanceof HTMLElement);
  const links = [...root.querySelectorAll('[data-nav-page-id]')]
    .filter((link) => link instanceof HTMLAnchorElement);
  if (pages.length === 0 || links.length === 0) {
    return;
  }

  const availableIds = new Set(pages.map((page) => page.dataset.pageId));
  const pageIdFromHash = () => {
    const hash = root.ownerDocument.defaultView?.location.hash ?? '';
    if (!hash.startsWith('#page-')) return null;
    try {
      const pageId = decodeURIComponent(hash.slice('#page-'.length));
      return availableIds.has(pageId) ? pageId : null;
    } catch {
      return null;
    }
  };
  /** @param {string} pageId */
  const activate = (pageId) => {
    for (const page of pages) {
      const isActive = page.dataset.pageId === pageId;
      page.hidden = !isActive;
    }
    for (const link of links) {
      const isActive = link.dataset.navPageId === pageId;
      link.classList.toggle('active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    }
  };

  activate(pageIdFromHash() ?? pages[0].dataset.pageId ?? '');
  root.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest('[data-nav-page-id]');
    if (!(link instanceof HTMLAnchorElement)) return;
    event.preventDefault();
    const pageId = link.dataset.navPageId;
    if (!pageId || !availableIds.has(pageId)) return;
    root.ownerDocument.defaultView?.history.pushState(null, '', link.href);
    activate(pageId);
    pages.find((page) => page.dataset.pageId === pageId)?.querySelector('h2')?.focus();
  });

  const defaultView = root.ownerDocument.defaultView;
  const onHashChange = () => {
    if (!root.isConnected) {
      defaultView?.removeEventListener('hashchange', onHashChange);
      return;
    }
    const pageId = pageIdFromHash();
    if (pageId) activate(pageId);
  };
  defaultView?.addEventListener('hashchange', onHashChange);
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
 * @param {Array<Record<string, unknown>>} rows
 * @returns {DataState['availability']}
 */
function inferAvailability(rows) {
  return rows.length > 0 ? 'available' : 'empty';
}

/**
 * @param {Map<string, LogicalSourceInput>} pageSources
 * @returns {DataState}
 */
function summarizeDataState(pageSources) {
  const sourceInputs = [...pageSources.values()];
  const metadata = sourceInputs.map((source) => source.metadata);
  const availabilities = sourceInputs.map((source) => source.metadata.availability ?? inferAvailability(source.rows));
  return {
    availability: availabilities.includes('unavailable')
      ? 'unavailable'
      : availabilities.length === 0 || availabilities.every((value) => value === 'empty')
        ? 'empty'
        : 'available',
    completeness: metadata.some((value) => value.completeness === 'partial')
      ? 'partial'
      : metadata.length > 0 && metadata.every((value) => value.completeness === 'complete')
        ? 'complete'
        : 'unknown',
    freshness: metadata.some((value) => value.freshness === 'stale')
      ? 'stale'
      : metadata.length > 0 && metadata.every((value) => value.freshness === 'fresh')
        ? 'fresh'
        : 'unknown'
  };
}

/**
 * @param {string} pageId
 * @param {unknown} view
 * @param {number} index
 * @param {Record<string, LogicalSourceInput>} sources
 * @param {'h3'|'h4'} [headingTag]
 * @returns {HTMLElement}
 */
function renderCustomView(pageId, view, index, sources, headingTag = 'h3') {
  const fallbackTitle = `View ${index + 1}`;
  if (!isPlainObject(view)) {
    return renderCustomViewState(pageId, fallbackTitle, null, 'unavailable', ['Invalid custom view definition.'], headingTag);
  }

  const title = typeof view.title === 'string' && view.title.length > 0
    ? view.title
    : typeof view.id === 'string' && view.id.length > 0
      ? titleCase(view.id)
      : fallbackTitle;

  const sourceName = getViewSource(view);
  if (!sourceName) {
    return renderCustomViewState(pageId, title, null, 'unavailable', ['Source unavailable.'], headingTag);
  }

  const sourceInput = sources[sourceName];
  if (!sourceInput || !Array.isArray(sourceInput.rows)) {
    return renderCustomViewState(pageId, title, sourceName, 'unavailable', [`Source unavailable: ${sourceName}`], headingTag);
  }

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

  const filteredRows = filterRowsForView(sourceInput.rows, view.data);
  const metadata = sourceInput.metadata;
  const state = sourceInput.metadata?.availability ?? inferAvailability(filteredRows);

  if (state !== 'available') {
    return renderCustomViewState(pageId, title, sourceName, state, contextDetails, headingTag);
  }

  if (filteredRows.length === 0) {
    return renderCustomViewState(pageId, title, sourceName, 'empty', contextDetails, headingTag);
  }

  if (view.mark === 'metric') {
    return renderMetricView(pageId, title, view, sourceName, filteredRows, metadata, contextDetails, headingTag);
  }
  if (pageId === 'workflows' && sourceName === 'workflows' && filteredRows.some(hasWorkflowTopology)) {
    return renderWorkflowTopologyView(pageId, title, sourceName, filteredRows, metadata, contextDetails, headingTag);
  }
  if (view.mark === 'table') {
    return renderTableView(pageId, title, view, sourceName, filteredRows, metadata, contextDetails, headingTag);
  }
  if (view.mark === 'chart') {
    return renderChartView(pageId, title, view, sourceName, filteredRows, metadata, contextDetails, headingTag);
  }

  return renderCustomViewState(pageId, title, sourceName, 'unavailable', [...contextDetails, 'Unsupported view mark.'], headingTag);
}

/**
 * @param {Record<string, unknown>} row
 * @returns {boolean}
 */
function hasWorkflowTopology(row) {
  return ['orchestrator', 'worker', 'standalone'].includes(String(row['workflow-role']));
}

/**
 * @param {string} pageId
 * @param {string} title
 * @param {string} sourceName
 * @param {Array<Record<string, unknown>>} rows
 * @param {SourceMetadata} metadata
 * @param {string[]} contextDetails
 * @param {'h3'|'h4'} [headingTag]
 * @returns {HTMLElement}
 */
function renderWorkflowTopologyView(pageId, title, sourceName, rows, metadata, contextDetails, headingTag = 'h3') {
  const packageRows = rows.filter((row) => row['workflow-role'] !== 'standalone' && typeof row.package === 'string');
  const standaloneRows = rows.filter((row) => row['workflow-role'] === 'standalone');
  /** @type {Map<string, Array<Record<string, unknown>>>} */
  const groupedPackages = new Map();
  for (const row of packageRows) {
    const packageId = String(row.package);
    const packageWorkflows = groupedPackages.get(packageId) ?? [];
    packageWorkflows.push(row);
    groupedPackages.set(packageId, packageWorkflows);
  }

  const packages = [...groupedPackages.entries()].sort(([left], [right]) => left.localeCompare(right));
  return renderPageSection(pageId, title, [
    ...renderViewSectionChrome(sourceName, metadata, contextDetails),
    h(
      'dl',
      { className: 'workflow-topology-summary', 'aria-label': 'Workflow topology summary' },
      renderTopologyMetric('Packages', packages.length),
      renderTopologyMetric('Central workflows', packageRows.length),
      renderTopologyMetric('Standalone workflows', standaloneRows.length)
    ),
    h(
      'div',
      { className: 'workflow-topology' },
      h(
        'section',
        { className: 'topology-plane', 'aria-labelledby': `${pageId}-control-plane-heading` },
        h(
          'header',
          { className: 'topology-plane-header' },
          h('span', { className: 'topology-step', 'aria-hidden': 'true' }, '01'),
          h(
            'div',
            null,
            h('p', { className: 'topology-kicker' }, 'Central execution'),
            h('h4', { id: `${pageId}-control-plane-heading` }, 'Operation packages'),
            h('p', null, 'Each package runs in the control plane as one orchestrator steering one or more workers.')
          )
        ),
        h(
          'div',
          { className: 'package-topology-list' },
          ...(packages.length > 0
            ? packages.map(([packageId, workflows]) => renderPackageTopology(packageId, workflows))
            : [h('p', { className: 'empty' }, 'No operation packages observed.')])
        )
      ),
      h(
        'div',
        { className: 'topology-boundary', role: 'separator', 'aria-label': 'Control-plane execution boundary' },
        h('span', null, 'safe outputs only'),
        h('i', { 'aria-hidden': 'true' })
      ),
      h(
        'section',
        { className: 'topology-plane target-plane', 'aria-labelledby': `${pageId}-target-plane-heading` },
        h(
          'header',
          { className: 'topology-plane-header' },
          h('span', { className: 'topology-step', 'aria-hidden': 'true' }, '02'),
          h(
            'div',
            null,
            h('p', { className: 'topology-kicker' }, 'Target repositories'),
            h('h4', { id: `${pageId}-target-plane-heading` }, 'Standalone workflows'),
            h('p', null, 'Repository-owned workflows run locally and are not part of a central operation package.')
          )
        ),
        renderStandaloneWorkflows(standaloneRows)
      )
    )
  ], headingTag);
}

/**
 * @param {string} label
 * @param {number} value
 * @returns {HTMLElement}
 */
function renderTopologyMetric(label, value) {
  return h('div', null, h('dt', null, label), h('dd', null, String(value)));
}

/**
 * @param {string} packageId
 * @param {Array<Record<string, unknown>>} workflows
 * @returns {HTMLElement}
 */
function renderPackageTopology(packageId, workflows) {
  const orchestrator = workflows.find((row) => row['workflow-role'] === 'orchestrator');
  const workers = workflows
    .filter((row) => row['workflow-role'] === 'worker')
    .sort(compareWorkflowRows);
  const packageName = workflows.find((row) => typeof row['package-name'] === 'string')?.['package-name'];
  const mode = String(orchestrator?.['rollout-mode'] ?? workflows[0]?.['rollout-mode'] ?? 'unknown');
  const active = workflows.every((row) => String(row['workflow-active']) === 'true');
  const complete = Boolean(orchestrator) && workers.length > 0;

  return h(
    'article',
    { className: 'package-topology', 'data-package-id': packageId },
    h(
      'header',
      { className: 'package-topology-header' },
      h('span', { className: 'package-icon' }, octicon('package')),
      h(
        'div',
        { className: 'package-identity' },
        h('h5', null, typeof packageName === 'string' ? packageName : titleCase(packageId)),
        h('p', null, `${workers.length} worker${workers.length === 1 ? '' : 's'} · ${toText(orchestrator?.repository ?? workflows[0]?.repository)}`)
      ),
      h('span', { className: `mode-indicator mode-${mode}` }, mode),
      h('span', { className: `status ${active && complete ? 'status-success' : 'status-attention'}` }, active && complete ? 'Active' : 'Needs attention')
    ),
    h(
      'div',
      { className: 'package-flow' },
      orchestrator
        ? renderWorkflowNode(orchestrator, 'orchestrator')
        : h('div', { className: 'workflow-node workflow-node-missing' }, h('strong', null, 'Orchestrator missing')),
      h(
        'div',
        { className: 'package-dispatch', 'aria-hidden': 'true' },
        h('span', null, 'dispatches'),
        h('i')
      ),
      h(
        'div',
        { className: 'worker-stack', role: 'list', 'aria-label': `${packageName ?? titleCase(packageId)} workers` },
        ...(workers.length > 0
          ? workers.map((worker) => renderWorkflowNode(worker, 'worker'))
          : [h('div', { className: 'workflow-node workflow-node-missing' }, h('strong', null, 'No workers observed'))])
      )
    )
  );
}

/**
 * @param {Record<string, unknown>} row
 * @param {'orchestrator'|'worker'} role
 * @returns {HTMLElement}
 */
function renderWorkflowNode(row, role) {
  return h(
    'div',
    { className: `workflow-node workflow-node-${role}`, role: 'listitem', 'data-workflow-role': role },
    h('span', { className: 'workflow-node-icon' }, octicon('workflow')),
    h(
      'div',
      { className: 'workflow-node-copy' },
      h('strong', null, toText(row['workflow-name'] ?? row.workflow)),
      h('code', null, toText(row.workflow)),
      h('small', null, role)
    )
  );
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @returns {HTMLElement}
 */
function renderStandaloneWorkflows(rows) {
  if (rows.length === 0) {
    return h('p', { className: 'empty' }, 'No standalone workflows observed.');
  }
  /** @type {Map<string, Array<Record<string, unknown>>>} */
  const byRepository = new Map();
  for (const row of [...rows].sort(compareWorkflowRows)) {
    const repository = toText(row.repository);
    const repositoryRows = byRepository.get(repository) ?? [];
    repositoryRows.push(row);
    byRepository.set(repository, repositoryRows);
  }
  return h(
    'div',
    { className: 'standalone-repository-list' },
    ...[...byRepository.entries()].map(([repository, workflows]) => h(
      'article',
      { className: 'standalone-repository', 'data-repository': repository },
      h(
        'header',
        null,
        h('span', { className: 'repository-icon' }, octicon('repo')),
        h('strong', null, repository),
        h('span', { className: 'workflow-count' }, `${workflows.length} workflow${workflows.length === 1 ? '' : 's'}`)
      ),
      h(
        'ul',
        null,
        ...workflows.map((workflow) => h(
          'li',
          null,
          h('span', { className: 'standalone-workflow-icon' }, octicon('workflow')),
          h('span', null, h('strong', null, toText(workflow['workflow-name'] ?? workflow.workflow)), h('code', null, toText(workflow.workflow))),
          h('span', { className: `mode-indicator mode-${toText(workflow['rollout-mode'])}` }, toText(workflow['rollout-mode'])),
          h('span', { className: `status ${String(workflow['workflow-active']) === 'true' ? 'status-success' : 'status-muted'}` }, String(workflow['workflow-active']) === 'true' ? 'Active' : 'Inactive')
        ))
      )
    ))
  );
}

/**
 * @param {Record<string, unknown>} left
 * @param {Record<string, unknown>} right
 * @returns {number}
 */
function compareWorkflowRows(left, right) {
  return toText(left['workflow-name'] ?? left.workflow).localeCompare(toText(right['workflow-name'] ?? right.workflow));
}

/**
 * @param {string} pageId
 * @param {string} title
 * @param {string | null} sourceName
 * @param {'available'|'empty'|'unavailable'} availability
 * @param {string[]} contextDetails
 * @param {'h3'|'h4'} [headingTag]
 * @returns {HTMLElement}
 */
function renderCustomViewState(pageId, title, sourceName, availability, contextDetails, headingTag = 'h3') {
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
  content.push(...renderContextChrome(contextDetails));
  return renderPageSection(pageId, title, content, headingTag);
}

/**
 * @param {string} pageId
 * @param {string} title
 * @param {Record<string, unknown>} view
 * @param {string} sourceName
 * @param {Array<Record<string, unknown>>} rows
 * @param {SourceMetadata} metadata
 * @param {string[]} contextDetails
 * @param {'h3'|'h4'} [headingTag]
 * @returns {HTMLElement}
 */
function renderMetricView(pageId, title, view, sourceName, rows, metadata, contextDetails, headingTag = 'h3') {
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

  const valueText = formatAggregateValue(rows, fieldName, aggregate, toText);

  /** @type {HTMLElement[]} */
  const content = [
    ...renderViewSectionChrome(sourceName, metadata, contextDetails),
    h('p', { className: 'metric-value', 'data-metric-value': fieldName ?? 'unknown' }, valueText)
  ];
  if (link) {
    content.push(h('p', { className: 'metric-link' }, renderExternalLink(link)));
  }
  return renderPageSection(pageId, title, content, headingTag);
}

/**
 * @param {string} pageId
 * @param {string} title
 * @param {Record<string, unknown>} view
 * @param {string} sourceName
 * @param {Array<Record<string, unknown>>} rows
 * @param {SourceMetadata} metadata
 * @param {string[]} contextDetails
 * @param {'h3'|'h4'} [headingTag]
 * @returns {HTMLElement}
 */
function renderTableView(pageId, title, view, sourceName, rows, metadata, contextDetails, headingTag = 'h3') {
  const columns = /** @type {TableField[]} */ (isPlainObject(view.encoding) && Array.isArray(view.encoding.columns)
    ? view.encoding.columns.filter((column) => isPlainObject(column) && typeof column.field === 'string')
    : []);
  const hrefDefinition = isPlainObject(view.encoding) && isPlainObject(view.encoding.href)
    ? view.encoding.href
    : null;
  const hrefField = typeof hrefDefinition?.field === 'string' ? hrefDefinition.field : null;
  const tableRows = prepareTableRows(rows, columns, view.data);
  const bodyRows = tableRows.map((row, rowIndex) => h(
    'tr',
    { 'data-custom-row-key': `${pageId}-${title}-${rowIndex}` },
    ...columns.map((column, columnIndex) => {
      const outputField = typeof column.as === 'string' ? column.as : column.field;
      const value = renderTableCellValue(column.field, row[outputField]);
      if (columnIndex === 0 && hrefField) {
        const link = findLink(row, /** @type {'external-link' | 'issue-link' | 'pull-request-link' | 'run-link' | 'evidence-link'} */ (hrefField));
        return h('td', null, value, link ? ' ' : null, link ? renderExternalLink(link) : null);
      }
      return h('td', null, value);
    })
  ));

  return renderPageSection(pageId, title, [
    ...renderViewSectionChrome(sourceName, metadata, contextDetails),
    renderTableRegion({
      tableClassName: 'custom-table',
      emptyMessage: 'No rows available.',
      colSpan: Math.max(columns.length, 1),
      headCells: columns.map((column) => fieldTitle(column)),
      filterLabel: `Filter ${title}`,
      filterId: typeof view.id === 'string' ? view.id : `${pageId}-table`,
      filterFields: columns.flatMap((column, columnIndex) => (
        ['nominal', 'ordinal'].includes(String(column.type))
          ? [{
            key: typeof column.as === 'string' ? column.as : column.field,
            label: fieldTitle(column),
            columnIndex
          }]
          : []
      )),
      bodyRows
    })
  ], headingTag);
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {TableField[]} columns
 * @param {unknown} dataConfig
 * @returns {Array<Record<string, unknown>>}
 */
function prepareTableRows(rows, columns, dataConfig) {
  const aggregateColumns = columns.filter((column) => typeof column.aggregate === 'string');
  let prepared = aggregateColumns.length > 0 ? aggregateTableRows(rows, columns) : [...rows];
  const orderBy = /** @type {TableField[]} */ (isPlainObject(dataConfig) && Array.isArray(dataConfig['order-by'])
    ? dataConfig['order-by'].filter((item) => isPlainObject(item) && typeof item.field === 'string')
    : []);
  if (orderBy.length > 0) {
    prepared.sort((left, right) => compareOrderedRows(left, right, orderBy, columns));
  }
  const limit = isPlainObject(dataConfig) && Number.isInteger(dataConfig.limit) && dataConfig.limit > 0
    ? dataConfig.limit
    : null;
  return limit === null ? prepared : prepared.slice(0, limit);
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {TableField[]} columns
 * @returns {Array<Record<string, unknown>>}
 */
function aggregateTableRows(rows, columns) {
  const dimensions = columns.filter((column) => typeof column.aggregate !== 'string');
  /** @type {Map<string, Array<Record<string, unknown>>>} */
  const groups = new Map();
  for (const row of rows) {
    const key = JSON.stringify(dimensions.map((column) => row[column.field]));
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => {
    const output = Object.fromEntries(dimensions.map((column) => [column.field, group[0]?.[column.field]]));
    for (const column of columns.filter((candidate) => typeof candidate.aggregate === 'string')) {
      const outputField = typeof column.as === 'string' ? column.as : column.field;
      output[outputField] = aggregateTableValue(group, column.field, column.aggregate);
    }
    return output;
  });
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {string} field
 * @param {unknown} aggregate
 * @returns {number | string}
 */
function aggregateTableValue(rows, field, aggregate) {
  const present = rows.map((row) => row[field]).filter((value) => value != null && value !== '');
  if (aggregate === 'count') return present.length;
  if (aggregate === 'distinct-count') return new Set(present.map(toText)).size;
  const values = present.map(toNumber);
  if (aggregate === 'sum') return values.reduce((total, value) => total + value, 0);
  if (aggregate === 'mean') return values.length > 0 ? values.reduce((total, value) => total + value, 0) / values.length : 'Unavailable';
  if (aggregate === 'min') return values.length > 0 ? Math.min(...values) : 'Unavailable';
  if (aggregate === 'max') return values.length > 0 ? Math.max(...values) : 'Unavailable';
  return present[0] == null ? 'Unavailable' : toText(present[0]);
}

/**
 * @param {Record<string, unknown>} left
 * @param {Record<string, unknown>} right
 * @param {TableField[]} orderBy
 * @param {TableField[]} columns
 * @returns {number}
 */
function compareOrderedRows(left, right, orderBy, columns) {
  for (const ordering of orderBy) {
    const comparison = compareTableValues(left[ordering.field], right[ordering.field]);
    if (comparison !== 0) return ordering.direction === 'desc' ? -comparison : comparison;
  }
  for (const column of columns.filter((candidate) => typeof candidate.aggregate !== 'string')) {
    const comparison = compareTableValues(left[column.field], right[column.field]);
    if (comparison !== 0) return comparison;
  }
  return 0;
}

/**
 * @param {unknown} left
 * @param {unknown} right
 * @returns {number}
 */
function compareTableValues(left, right) {
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return toText(left).localeCompare(toText(right));
}

/**
 * @param {string} field
 * @param {unknown} value
 * @returns {string | HTMLElement}
 */
function renderTableCellValue(field, value) {
  if (field === 'rollout-mode') return renderModeBadge(value);
  if (field === 'workflow-active') return renderActiveStateBadge(value);
  if ([
    'run-status',
    'run-conclusion',
    'outcome-state',
    'finding-severity',
    'finding-status',
    'grader-status',
    'eval-result',
    'maturity-status'
  ].includes(field)) {
    return renderStatusBadge(value);
  }
  return toText(value);
}

/**
 * @param {string} pageId
 * @param {string} title
 * @param {Record<string, unknown>} view
 * @param {string} sourceName
 * @param {Array<Record<string, unknown>>} rows
 * @param {SourceMetadata} metadata
 * @param {string[]} contextDetails
 * @param {'h3'|'h4'} [headingTag]
 * @returns {HTMLElement}
 */
function renderChartView(pageId, title, view, sourceName, rows, metadata, contextDetails, headingTag = 'h3') {
  const encoding = isPlainObject(view.encoding) ? view.encoding : null;
  const x = isPlainObject(encoding?.x) && typeof encoding.x.field === 'string' ? encoding.x : null;
  const y = isPlainObject(encoding?.y) && typeof encoding.y.field === 'string' ? encoding.y : null;
  const color = isPlainObject(encoding?.color) && typeof encoding.color.field === 'string' ? encoding.color : null;
  const chartDefault = x?.type === 'temporal' ? 'line' : 'bar';
  const chartType = typeof view.chart === 'string' ? view.chart : chartDefault;

  const points = buildChartPoints(pageId, title, rows, x, y, color);
  const chartSeries = listChartSeries(points);

  return renderPageSection(pageId, title, [
    ...renderViewSectionChrome(sourceName, metadata, contextDetails),
    h(
      'p',
      { className: 'chart-default', 'data-chart-default': chartDefault, 'data-chart-type': chartType },
      typeof view.chart === 'string' ? `Chart type: ${chartType}` : `Default chart type: ${chartDefault}`
    ),
    ...(color
      ? [h(
        'p',
        { className: 'chart-legend-text', 'data-chart-legend': 'text' },
        `Color categories: ${chartSeries.length > 0 ? chartSeries.map((series) => series.name).join(', ') : 'unknown'}`
      ),
      renderChartLegend(chartSeries, chartType)]
      : []),
    renderChartWidget(chartType, points, chartSeries),
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
    })
  ], headingTag);
}

/**
 * @param {string} pageId
 * @param {string} title
 * @param {Array<Record<string, unknown>>} rows
 * @param {Record<string, any> | null} x
 * @param {Record<string, any> | null} y
 * @param {Record<string, any> | null} color
 * @returns {Array<{ key: string, x: string, y: number, color: string | null }>}
 */
function buildChartPoints(pageId, title, rows, x, y, color) {
  const aggregate = typeof y?.aggregate === 'string' ? y.aggregate : null;
  if (!aggregate) {
    return rows.map((row, rowIndex) => ({
      key: `${pageId}-${title}-${rowIndex}`,
      x: x ? toText(row[x.field]) : 'unknown',
      y: y ? toNumber(row[y.field]) : 0,
      color: color ? toText(row[color.field]) : null
    }));
  }

  /** @type {Map<string, { x: string, color: string | null, values: unknown[] }>} */
  const groups = new Map();
  for (const row of rows) {
    const xValue = x ? toText(row[x.field]) : 'unknown';
    const colorValue = color ? toText(row[color.field]) : null;
    const key = JSON.stringify([xValue, colorValue]);
    const group = groups.get(key) ?? { x: xValue, color: colorValue, values: [] };
    group.values.push(y ? row[y.field] : null);
    groups.set(key, group);
  }
  return [...groups.values()].map((group, index) => {
    const numericValues = group.values.map(toNumber);
    let value = 0;
    if (aggregate === 'count') {
      value = group.values.filter((candidate) => candidate != null && candidate !== '').length;
    } else if (aggregate === 'distinct-count') {
      value = new Set(group.values.map(toText)).size;
    } else if (aggregate === 'sum') {
      value = numericValues.reduce((total, candidate) => total + candidate, 0);
    } else if (aggregate === 'mean') {
      value = numericValues.length > 0
        ? numericValues.reduce((total, candidate) => total + candidate, 0) / numericValues.length
        : 0;
    } else if (aggregate === 'min') {
      value = numericValues.length > 0 ? Math.min(...numericValues) : 0;
    } else if (aggregate === 'max') {
      value = numericValues.length > 0 ? Math.max(...numericValues) : 0;
    }
    return { key: `${pageId}-${title}-${index}`, x: group.x, y: value, color: group.color };
  });
}

/**
 * @param {string} chartType
 * @param {Array<{ x: string, y: number, color: string | null }>} points
 * @param {Array<{ name: string, className: string }>} series
 * @returns {HTMLElement}
 */
function renderChartWidget(chartType, points, series) {
  if (chartType === 'pie') {
    const totals = new Map();
    for (const point of points) {
      const category = point.x;
      totals.set(category, (totals.get(category) ?? 0) + point.y);
    }
    const entries = [...totals.entries()].filter(([, value]) => value > 0);
    const total = entries.reduce((sum, [, value]) => sum + value, 0);
    let offset = 0;
    return h(
      'div',
      { className: 'chart-widget pie-chart-widget', 'data-chart-widget': 'pie' },
      h(
        'svg',
        { viewBox: '0 0 42 42', role: 'img', 'aria-label': `Pie chart: ${entries.map(([label, value]) => `${label} ${formatNumber(value)}`).join(', ') || 'no data'}` },
        h('circle', { className: 'pie-chart-track', cx: 21, cy: 21, r: 15.9155, fill: 'none', 'stroke-width': 8 }),
        ...entries.map(([label, value], index) => {
          const percent = total > 0 ? (value / total) * 100 : 0;
          const segment = h('circle', {
            className: `pie-chart-segment chart-series-${(index % 5) + 1}`,
            cx: 21,
            cy: 21,
            r: 15.9155,
            fill: 'none',
            'stroke-width': 8,
            'stroke-dasharray': `${percent} ${100 - percent}`,
            'stroke-dashoffset': String(-offset),
            'data-chart-category': label,
            tabIndex: 0,
            role: 'img',
            'aria-label': `${label}: ${formatNumber(value)}`
          }, h('title', null, `${label}: ${formatNumber(value)}`));
          offset += percent;
          return segment;
        })
      )
    );
  }

  if (chartType === 'line') {
    const groupedSeries = groupChartSeries(points);
    const seriesClassNames = new Map(series.map((item) => [item.name, item.className]));
    const xValues = [...new Set(points.map((point) => point.x))];
    const values = points.map((point) => toNumber(point.y));
    const finiteValues = values.filter(Number.isFinite);
    const maximum = Math.max(...finiteValues, 1);
    return h(
      'div',
      { className: 'chart-widget line-chart-widget', 'data-chart-widget': 'line' },
      h(
        'svg',
        { viewBox: '0 0 100 42', role: 'img', 'aria-label': `Line chart with ${points.length} points` },
        h('line', { className: 'line-chart-axis', x1: 0, y1: 38, x2: 100, y2: 38 }),
        ...groupedSeries.flatMap(([seriesName, seriesPoints]) => {
          const seriesClassName = seriesClassNames.get(seriesName) ?? 'chart-series-1';
          const coordinates = seriesPoints.map((point) => {
            const xIndex = xValues.indexOf(point.x);
            const x = xValues.length < 2 ? 50 : (xIndex / (xValues.length - 1)) * 100;
            const y = 38 - (Math.max(0, point.y) / maximum) * 34;
            return { point, x, y };
          });
          return [
            h('polyline', {
              className: `line-chart-series ${seriesClassName}`,
              points: coordinates.map(({ x, y }) => `${x},${y}`).join(' '),
              fill: 'none',
              'data-chart-series': seriesName
            }),
            ...coordinates.map(({ point, x, y }) => h('g', {
              className: 'chart-point',
              tabIndex: 0,
              role: 'img',
              'aria-label': chartPointLabel(point)
            },
            h('title', null, chartPointLabel(point)),
            h('circle', {
              className: `line-chart-point ${seriesClassName}`,
              cx: x,
              cy: y,
              r: 2.5
            }),
            h(
              'g',
              {
                className: 'point-tooltip',
                transform: `translate(${Math.min(Math.max(x - 21, 1), 57)} ${Math.max(y - 12, 1)})`,
                'aria-hidden': 'true'
              },
              h('rect', { width: 42, height: 9, rx: 2 }),
              h('text', { x: 3, y: 6 }, chartPointLabel(point))
            )))
          ];
        })
      )
    );
  }

  const maximum = Math.max(...points.map((point) => point.y), 1);
  const barWidth = points.length > 0 ? Math.min(14, 80 / points.length) : 14;
  const seriesClassNames = new Map(series.map((item) => [item.name, item.className]));
  return h(
    'div',
    { className: 'chart-widget bar-chart-widget', 'data-chart-widget': 'bar' },
    h(
      'svg',
      { viewBox: '0 0 100 42', role: 'img', 'aria-label': `Bar chart with ${points.length} bars` },
      h('line', { className: 'bar-chart-axis', x1: 0, y1: 38, x2: 100, y2: 38 }),
      ...points.map((point, index) => {
        const x = ((index + 0.5) / Math.max(points.length, 1)) * 100 - (barWidth / 2);
        const height = Math.max(1, (Math.max(0, point.y) / maximum) * 34);
        return h('rect', {
          className: `bar-chart-bar ${seriesClassNames.get(point.color ?? 'value') ?? 'chart-series-1'}`,
          x,
          y: 38 - height,
          width: barWidth,
          height,
          tabIndex: 0,
          role: 'img',
          'aria-label': chartPointLabel(point)
        }, h('title', null, chartPointLabel(point)));
      })
    )
  );
}

/**
 * @param {Array<{ x: string, y: number, color: string | null }>} points
 * @returns {Array<{ name: string, className: string }>}
 */
function listChartSeries(points) {
  return groupChartSeries(points).map(([name], index) => ({
    name,
    className: `chart-series-${(index % 5) + 1}`
  }));
}

/**
 * @param {Array<{ name: string, className: string }>} series
 * @param {string} chartType
 * @returns {HTMLElement}
 */
function renderChartLegend(series, chartType) {
  return h(
    'ul',
    { className: `chart-legend chart-legend-${chartType}`, 'data-chart-legend': 'visual' },
    series.map((item) => h(
      'li',
      null,
      h('i', { className: item.className, 'aria-hidden': 'true' }),
      h('span', null, item.name)
    ))
  );
}

/**
 * @param {Array<{ x: string, y: number, color: string | null }>} points
 * @returns {Array<[string, Array<{ x: string, y: number, color: string | null }>]>}
 */
function groupChartSeries(points) {
  const grouped = new Map();
  for (const point of points) {
    const name = point.color ?? 'value';
    const series = grouped.get(name) ?? [];
    series.push(point);
    grouped.set(name, series);
  }
  return [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right));
}

/**
 * @param {{ x: string, y: number, color: string | null }} point
 * @returns {string}
 */
function chartPointLabel(point) {
  return `${point.x}: ${formatNumber(point.y)}${point.color ? `, ${point.color}` : ''}`;
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
 * @param {Record<string, unknown> | undefined} dataConfig
 * @returns {Array<Record<string, unknown>>}
 */
function filterRowsForView(rows, dataConfig) {
  if (!Array.isArray(rows)) {
    return [];
  }

  let filteredRows = rows;
  if (isPlainObject(dataConfig?.scope)) {
    filteredRows = filteredRows.filter((row) => rowMatchesScope(row, /** @type {Record<string, unknown>} */ (dataConfig.scope)));
  }
  if (isPlainObject(dataConfig?.time)) {
    filteredRows = filteredRows.filter((row) => rowMatchesTime(row, /** @type {Record<string, unknown>} */ (dataConfig.time)));
  }
  if (isPlainObject(dataConfig?.filters)) {
    filteredRows = filteredRows.filter((row) => rowMatchesFilters(row, /** @type {Record<string, unknown>} */ (dataConfig.filters)));
  }
  return filteredRows;
}

/**
 * @param {Record<string, unknown>} row
 * @param {Record<string, unknown>} scope
 * @returns {boolean}
 */
function rowMatchesScope(row, scope) {
  const scopeToField = {
    organizations: 'organization',
    repositories: 'repository',
    workflows: 'workflow'
  };

  for (const [scopeKey, fieldName] of Object.entries(scopeToField)) {
    const allowed = scope[scopeKey];
    if (!Array.isArray(allowed) || allowed.length === 0) {
      continue;
    }
    const value = row[fieldName];
    if (typeof value !== 'string' || !allowed.includes(value)) {
      return false;
    }
  }
  return true;
}

/**
 * @param {Record<string, unknown>} row
 * @param {Record<string, unknown>} time
 * @returns {boolean}
 */
function rowMatchesTime(row, time) {
  const observedField = pickRowTimeField(row);
  if (!observedField) {
    return false;
  }

  const rowInstant = Date.parse(String(row[observedField]));
  if (!Number.isFinite(rowInstant)) {
    return false;
  }

  const start = typeof time.start === 'string' ? Date.parse(time.start) : Number.NaN;
  const end = typeof time.end === 'string' ? Date.parse(time.end) : Number.NaN;
  if (Number.isFinite(start) && rowInstant < start) {
    return false;
  }
  if (Number.isFinite(end) && rowInstant >= end) {
    return false;
  }
  return true;
}

/**
 * @param {Record<string, unknown>} row
 * @returns {string | null}
 */
function pickRowTimeField(row) {
  if (typeof row['observed-at'] === 'string') {
    return 'observed-at';
  }
  if (typeof row['started-at'] === 'string') {
    return 'started-at';
  }
  if (typeof row['ended-at'] === 'string') {
    return 'ended-at';
  }
  return null;
}

/**
 * @param {Record<string, unknown>} row
 * @param {Record<string, unknown>} filters
 * @returns {boolean}
 */
function rowMatchesFilters(row, filters) {
  for (const [fieldName, expected] of Object.entries(filters)) {
    const value = row[fieldName];
    if (Array.isArray(expected)) {
      if (!expected.some((candidate) => valuesEqualForFilter(value, candidate))) {
        return false;
      }
      continue;
    }
    if (!valuesEqualForFilter(value, expected)) {
      return false;
    }
  }
  return true;
}

/**
 * @param {unknown} actual
 * @param {unknown} expected
 * @returns {boolean}
 */
function valuesEqualForFilter(actual, expected) {
  if (actual == null) {
    return expected === 'unknown';
  }
  return String(actual) === String(expected);
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
 * @param {Record<string, unknown>} row
 * @param {'issue-link'|'pull-request-link'|'run-link'|'external-link'|'evidence-link'} field
 * @returns {{ href: string, label: string } | null}
 */
function findLink(row, field) {
  const candidate = row[field];
  if (!isPlainObject(candidate) || typeof candidate.href !== 'string' || typeof candidate.label !== 'string') {
    return null;
  }
  try {
    const url = new URL(candidate.href);
    if (url.protocol !== 'https:' || url.username || url.password || candidate.label.trim().length === 0) {
      return null;
    }
  } catch {
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
 * @param {{ href: string, label: string }} link
 * @returns {HTMLElement}
 */
function renderExternalLink(link) {
  return h('a', {
    href: link.href,
    target: '_blank',
    rel: 'noopener noreferrer',
    'aria-label': link.label
  }, link.label, octicon('external-link'));
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
