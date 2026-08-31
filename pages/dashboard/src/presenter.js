/**
 * Presenter for JSON-driven dashboard pages using GitHub Primer styling and elements.
 */

import builtInDashboard from '../dashboard.json' with { type: 'json' };
import { h } from './dom.js';
import { getPrimerStyles } from './styles.js';
import { octicon, agenticWorkflowMark } from './octicons.js';
import { renderDataStateMetrics } from './components/data-state.js';
import { renderTableRegion } from './components/table-region.js';
import { customViewAvailabilityMessage, renderCustomViewStateDetails, renderPageSection, renderViewSectionChrome } from './components/view-chrome.js';
import { formatAggregateValue, formatNumber, toNumber } from './view-formatters.js';
import { renderActiveStateBadge, renderModeBadge, renderStatusBadge } from './components/badge.js';
import { findFirstLink, findLink, renderExternalLink, renderLinkedValueWithExternalLink } from './components/link-content.js';
import { renderLinkedText, createEntityAwareCellRenderer } from './components/linked-text.js';
import { elementHandlesEmptyRows, renderUiElement } from './components/ui-elements.js';
import { groupChartSeries, listChartSeries, pieChartEntries, renderChartLegend, renderPieLegend } from './components/chart-elements.js';
import { deriveOverviewSources } from './overview-data.js';

/**
 * @typedef {{ availability: 'available'|'empty'|'unavailable', completeness: 'complete'|'partial'|'unknown', freshness: 'fresh'|'stale'|'unknown' }} DataState
 */

/**
 * @typedef {{ 'source-id': string, 'source-kind': string, 'as-of': string, 'retrieved-at': string, 'coverage-start'?: string, 'coverage-end'?: string, completeness: DataState['completeness'], freshness: DataState['freshness'], availability?: DataState['availability'] }} SourceMetadata
 */

/**
 * @typedef {{ source: string, rows: Array<Record<string, unknown>>, metadata: SourceMetadata }} LogicalSourceInput
 */

/**
 * @typedef {{ id: string, title?: string, description?: string, layout: 'full'|'wide'|'narrow', views: string[] }} PresentablePageSection
 */

/**
 * @typedef {{ id: string, kind: 'built-in', page: string, title?: string, description?: string, icon?: string, ['class-name']?: string, definition?: { views?: Array<unknown>, sections?: PresentablePageSection[], ['data-state']?: Record<string, boolean> } }} PresentableBuiltInPage
 */

/**
 * @typedef {{ id: string, kind: 'custom', title?: string, description?: string, icon?: string, ['class-name']?: string, views: unknown[], sections?: PresentablePageSection[] }} PresentableCustomPage
 */

/**
 * @typedef {{ field: string, aggregate?: string, as?: string, direction?: string, display?: string } & Record<string, unknown>} TableField
 */

/**
 * @typedef {{ label?: string, pages?: string[] }} PresentableNavigationSection
 */

/**
 * @typedef {{ id: string, title: string, description?: string, defaults?: Record<string, unknown>, pages: Array<PresentableBuiltInPage | PresentableCustomPage>, ['github-url-base']?: string, repository?: string, navigation?: PresentableNavigationSection[] }} PresentableDashboard
 */

/**
 * @typedef {{ languageVersion: string, dashboard: PresentableDashboard }} PresentationDocument
 */

/**
 * @typedef {{ document: PresentationDocument, sources: Record<string, LogicalSourceInput> }} PresentationInput
 */

/**
 * @typedef {'organization-link'|'repository-link'|'workflow-link'|'issue-link'|'pull-request-link'|'run-link'|'evidence-link'|'external-link'} LinkFieldName
 */

const DEFAULT_GITHUB_URL_BASE = 'https://github.com';
const REFRESH_CONTROL_DESCRIPTION = 'Reload the dashboard to refresh cached data';

/** @type {{ organization: 'organization-link', repository: 'repository-link', workflow: 'workflow-link' }} */
const ENTITY_LINK_FIELDS = {
  organization: 'organization-link',
  repository: 'repository-link',
  workflow: 'workflow-link'
};


/** @type {Record<string, PresentableCustomPage>} */
const BUILT_IN_PAGE_PAYLOADS = /** @type {Record<string, PresentableCustomPage>} */ (Object.fromEntries(
  builtInDashboard.dashboard.pages.map((page) => [
    page.page,
    {
      id: page.id,
      kind: 'custom',
      title: page.title,
      description: 'description' in page ? page.description : undefined,
      'class-name': 'class-name' in page ? page['class-name'] : undefined,
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
    'class-name': page['class-name'] ?? payload?.['class-name'],
    views: payload?.views ?? [],
    sections: payload?.sections
  };
}

/**
 * @param {PresentationInput} input
 * @returns {HTMLElement}
 */
export function renderDashboard(input) {
  const { document, sources: rawSources } = input;
  const title = document.dashboard.title;
  const description = document.dashboard.description;
  const pages = document.dashboard.pages;
  const githubUrlBase = typeof document.dashboard['github-url-base'] === 'string' && document.dashboard['github-url-base'].length > 0
    ? document.dashboard['github-url-base']
    : DEFAULT_GITHUB_URL_BASE;
  const dashboardRepository = typeof document.dashboard.repository === 'string' && document.dashboard.repository.length > 0
    ? document.dashboard.repository
    : null;
  const sources = deriveOverviewSources(deriveEntityLinkSources(rawSources, githubUrlBase));
  const orgName = inferOrganizationName(sources) || 'GitHub';

  const styleEl = h('style', null, getPrimerStyles());
  const skipLink = h('a', { href: '#main-content', className: 'skip-link' }, 'Skip to main content');

  const sidebar = renderSidebar(pages, orgName, document.dashboard.navigation);
  const mainContent = renderMainContent(document, title, description, pages, sources, orgName, githubUrlBase, dashboardRepository);

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
 * @param {PresentableNavigationSection[] | undefined} navigation
 * @returns {HTMLElement}
 */
function renderSidebar(pages, orgName, navigation) {
  const firstPageId = pages[0]?.id;
  const pagesById = new Map(pages.map((page) => [page.id, page]));
  const navigationSections = Array.isArray(navigation) && navigation.length > 0
    ? navigation
      .map((section) => ({
        label: section?.label,
        pages: (Array.isArray(section?.pages) ? section.pages : [])
          .map((pageId) => pagesById.get(pageId))
          .filter((page) => page !== undefined)
      }))
      .filter((section) => section.pages.length > 0)
    : [{ label: undefined, pages }];
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
      navigationSections.flatMap((section) => [
        ...(typeof section.label === 'string' && section.label.length > 0
          ? [h('span', { className: 'nav-section-label' }, section.label)]
          : []),
        ...section.pages.map((page) => renderNavItem(page, page.id === firstPageId))
      ])
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
  return typeof page.icon === 'string' ? page.icon : 'server';
}

/**
 * @param {PresentationDocument} document
 * @param {string} title
 * @param {string | undefined} description
 * @param {Array<PresentableBuiltInPage | PresentableCustomPage>} pages
 * @param {Record<string, LogicalSourceInput>} sources
 * @param {string} orgName
 * @param {string} githubUrlBase
 * @param {string | null} dashboardRepository
 * @returns {HTMLElement}
 */
function renderMainContent(document, title, description, pages, sources, orgName, githubUrlBase, dashboardRepository) {
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
        h(
          'div',
          { className: 'report-actions' },
          latestRetrieval
            ? h('time', { className: 'freshness', dateTime: latestRetrieval }, `Last updated ${formatReportDate(latestRetrieval)}`)
            : null,
          h(
            'button',
            {
              type: 'button',
              className: 'refresh-button',
              title: REFRESH_CONTROL_DESCRIPTION,
              'aria-label': REFRESH_CONTROL_DESCRIPTION,
              onclick: () => window.location.reload()
            },
            octicon('sync'),
            h('span', null, 'Refresh')
          ),
          dashboardRepository
            ? h(
              'a',
              {
                className: 'repository-link',
                href: `${githubUrlBase}/${dashboardRepository}`,
                'aria-label': `View ${dashboardRepository} on GitHub`,
                title: `View ${dashboardRepository} on GitHub`
              },
              octicon('mark-github')
            )
            : null
        )
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
    return renderCustomPage(payload, title, sources);
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
  const sections = Array.isArray(page.sections) ? page.sections : [];
  /** @type {Map<string, LogicalSourceInput>} */
  const pageSources = new Map();
  for (const view of views) {
    for (const sourceName of getViewSources(view)) {
      if (sources[sourceName]) {
        pageSources.set(sourceName, sources[sourceName]);
      }
    }
  }
  const renderedViews = views.map((view, index) => {
    const rendered = renderCustomView(page.id, view, index, sources, sections.length > 0 ? 'h4' : 'h3');
    const layout = isPlainObject(view) && typeof view.layout === 'string' ? view.layout : 'full';
    const disclosure = isPlainObject(view) && view.disclosure === 'supplemental' ? 'supplemental' : 'essential';
    rendered.classList.add('custom-view');
    rendered.setAttribute('data-view-layout', layout);
    rendered.setAttribute('data-disclosure', disclosure);
    if (disclosure === 'essential') {
      return rendered;
    }

    rendered.classList.remove('custom-view');
    rendered.removeAttribute('data-view-layout');
    return h(
      'details',
      {
        className: 'custom-view view-disclosure',
        'data-view-layout': layout,
        'data-disclosure': disclosure
      },
      h(
        'summary',
        { className: 'view-disclosure-summary' },
        h('span', null, getViewTitle(view, index)),
        h('span', { className: 'view-disclosure-hint' }, 'Show details')
      ),
      rendered
    );
  });
  const renderedViewsById = new Map(views.map((view, index) => [
    isPlainObject(view) && typeof view.id === 'string' ? view.id : `view-${index + 1}`,
    renderedViews[index]
  ]));
  const renderedContent = sections.length > 0
    ? h(
      'div',
      { className: 'page-layout-grid' },
      ...sections.map((section) => renderLayoutSection(page.id, section, renderedViewsById))
    )
    : h('div', { className: 'custom-view-grid' }, ...renderedViews);
  const pageClassName = typeof page['class-name'] === 'string' && page['class-name'].length > 0
    ? ` ${page['class-name']}`
    : '';

  return h(
    'section',
    {
      className: `dashboard-page${pageClassName}`,
      id: `page-${page.id}`,
      'data-page-kind': 'custom',
      'data-page-name': page.id,
      'data-page-id': page.id
    },
    h('h2', { tabIndex: -1 }, title),
    page.description ? h('p', { className: 'page-description' }, page.description) : null,
    ...(renderedViews.length > 0
      ? [renderDataStateMetrics(summarizeDataState(pageSources)), renderedContent]
      : [h('p', null, 'No custom views available.')])
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
 * @returns {string[]}
 */
function getViewSources(view) {
  if (!isPlainObject(view) || !isPlainObject(view.data)) {
    return [];
  }
  if (Array.isArray(view.data.sources)) {
    return view.data.sources.filter((source) => typeof source === 'string');
  }
  return typeof view.data.source === 'string' ? [view.data.source] : [];
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

  const title = getViewTitle(view, index);

  const contextDetails = [];
  if (isPlainObject(view.data?.scope) && Object.keys(view.data.scope).length > 0) {
    contextDetails.push(`Scope: ${JSON.stringify(view.data.scope)}`);
  }
  if (isPlainObject(view.data?.time) && Object.keys(view.data.time).length > 0) {
    contextDetails.push(`Time: ${JSON.stringify(view.data.time)}`);
  }
  if (isPlainObject(view.data?.filters) && Object.keys(view.data.filters).length > 0) {
    contextDetails.push(`Filters: ${JSON.stringify(view.data.filters)}`);
  }

  if (view.mark === 'element') {
    return renderElementView(pageId, title, view, sources, contextDetails, headingTag);
  }

  const sourceName = getViewSources(view)[0] ?? null;
  if (!sourceName) {
    return renderCustomViewState(pageId, title, null, 'unavailable', ['Source unavailable.'], headingTag);
  }

  const sourceInput = sources[sourceName];
  if (!sourceInput || !Array.isArray(sourceInput.rows)) {
    return renderCustomViewState(pageId, title, sourceName, 'unavailable', [`Source unavailable: ${sourceName}`], headingTag);
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
  if (view.mark === 'table') {
    return renderTableView(pageId, title, view, sourceName, filteredRows, metadata, contextDetails, headingTag);
  }
  if (view.mark === 'chart') {
    return renderChartView(pageId, title, view, sourceName, filteredRows, metadata, contextDetails, headingTag);
  }

  return renderCustomViewState(pageId, title, sourceName, 'unavailable', [...contextDetails, 'Unsupported view mark.'], headingTag);
}

/**
 * @param {unknown} view
 * @param {number} index
 * @returns {string}
 */
function getViewTitle(view, index) {
  if (isPlainObject(view)) {
    if (typeof view.title === 'string' && view.title.length > 0) {
      return view.title;
    }
    if (typeof view.id === 'string' && view.id.length > 0) {
      return titleCase(view.id);
    }
  }
  return `View ${index + 1}`;
}

/**
 * @param {string} pageId
 * @param {string} title
 * @param {Record<string, unknown>} view
 * @param {Record<string, LogicalSourceInput>} sources
 * @param {string[]} contextDetails
 * @param {'h3'|'h4'} headingTag
 * @returns {HTMLElement}
 */
function renderElementView(pageId, title, view, sources, contextDetails, headingTag) {
  const elementName = typeof view.element === 'string' ? view.element : '';
  const sourceNames = getViewSources(view);
  if (sourceNames.length === 0) {
    return renderCustomViewState(pageId, title, null, 'unavailable', [...contextDetails, 'No sources declared for element view.'], headingTag);
  }

  const selectedSources = Object.fromEntries(sourceNames.flatMap((sourceName) => {
    const source = sources[sourceName];
    return source && Array.isArray(source.rows)
      ? [[sourceName, { ...source, rows: filterRowsForView(source.rows, isPlainObject(view.data) ? view.data : undefined) }]]
      : [];
  }));

  if (sourceNames.length === 1) {
    const sourceName = sourceNames[0];
    const source = selectedSources[sourceName];
    if (!source) {
      return renderCustomViewState(pageId, title, sourceName, 'unavailable', contextDetails, headingTag);
    }
    const state = source.metadata?.availability ?? inferAvailability(source.rows);
    if (state !== 'available') {
      return renderCustomViewState(pageId, title, sourceName, state, contextDetails, headingTag);
    }
    if (source.rows.length === 0 && !elementHandlesEmptyRows(elementName)) {
      return renderCustomViewState(pageId, title, sourceName, 'empty', contextDetails, headingTag);
    }
  }

  return renderUiElement(elementName, {
    pageId,
    title,
    description: typeof view.description === 'string' ? view.description : undefined,
    sourceNames,
    sources: selectedSources,
    contextDetails,
    headingTag
  }) ?? renderCustomViewState(pageId, title, null, 'unavailable', [...contextDetails, 'Unsupported UI element.'], headingTag);
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
  return renderPageSection(pageId, title, [
    h('p', { 'data-view-availability': availability }, customViewAvailabilityMessage(availability)),
    ...renderCustomViewStateDetails(sourceName, contextDetails)
  ], headingTag);
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
  const link = hrefField ? findFirstLink(rows, /** @type {LinkFieldName} */ (hrefField)) : null;

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
      const value = renderEntityAwareCellValue(column, row[outputField], row);
      if (columnIndex === 0 && hrefField) {
        const link = findLink(row, /** @type {LinkFieldName} */ (hrefField));
        return h('td', null, renderLinkedValueWithExternalLink(value, link));
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
      summaryColumns: columns.map((column) => {
        const outputField = typeof column.as === 'string' ? column.as : column.field;
        return {
          label: fieldTitle(column),
          type: String(column.type ?? ''),
          values: tableRows.map((row) => row[outputField])
        };
      }),
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
 * @param {unknown} display
 * @param {unknown} value
 * @returns {string | HTMLElement}
 */
function renderTableCellValue(display, value) {
  if (display === 'mode') return renderModeBadge(value);
  if (display === 'active-state') return renderActiveStateBadge(value);
  if (display === 'status') return renderStatusBadge(value);
  return toText(value);
}

const renderEntityAwareCellValue = createEntityAwareCellRenderer(ENTITY_LINK_FIELDS, findLink, renderTableCellValue, toText);

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
  const href = isPlainObject(encoding?.href) && typeof encoding.href.field === 'string' ? encoding.href : null;
  const chartDefault = x?.type === 'temporal' ? 'line' : 'bar';
  const chartType = typeof view.chart === 'string' ? view.chart : chartDefault;

  const points = prepareChartPoints(
    buildChartPoints(pageId, title, rows, x, y, color, href?.field ?? null),
    x,
    y,
    color,
    view.data
  );
  const chartSeries = listChartSeries(points);
  const pieSummary = chartType === 'pie' ? pieChartEntries(points) : null;
  const description = typeof view.description === 'string' && view.description.length > 0
    ? h('p', { className: 'view-description' }, view.description)
    : null;
  const chartWidget = renderChartWidget(chartType, points, chartSeries, pieSummary, y ? fieldTitle(y) : 'Total');
  const table = renderTableRegion({
    tableClassName: 'custom-chart-table',
    emptyMessage: 'No points available.',
    colSpan: color ? 3 : 2,
    headCells: [x ? fieldTitle(x) : 'X', y ? fieldTitle(y) : 'Y', ...(color ? [fieldTitle(color)] : [])],
    bodyRows: points.length > 0
      ? points.map((point) => h(
        'tr',
        { 'data-custom-point-key': point.key },
        h('td', null, renderLinkedText(point.x, point.link)),
        h('td', null, point.y),
        color ? h('td', null, point.color ?? 'unknown') : null
      ))
      : []
  });

  const section = renderPageSection(pageId, title, [
    ...(description ? [description] : []),
    ...renderViewSectionChrome(sourceName, metadata, contextDetails),
    ...(color && chartType !== 'pie'
      ? [renderChartLegend(chartSeries, chartType)]
      : []),
    ...(pieSummary
      ? [h(
        'div',
        { className: 'pie-chart-layout' },
        chartWidget,
        renderPieLegend(pieSummary.entries, pieSummary.total, chartCategoryLinks(points))
      )]
      : [chartWidget]),
    table
  ], headingTag);
  section.classList.add('chart-view', `chart-view-${chartType}`);
  return section;
}

/**
 * @param {string} pageId
 * @param {string} title
 * @param {Array<Record<string, unknown>>} rows
 * @param {Record<string, any> | null} x
 * @param {Record<string, any> | null} y
 * @param {Record<string, any> | null} color
 * @param {string | null} hrefField
 * @returns {Array<{ key: string, x: string, y: number, color: string | null, link: { href: string, label: string } | null }>}
 */
function buildChartPoints(pageId, title, rows, x, y, color, hrefField) {
  const aggregate = typeof y?.aggregate === 'string' ? y.aggregate : null;
  if (!aggregate) {
    return rows.map((row, rowIndex) => ({
      key: `${pageId}-${title}-${rowIndex}`,
      x: x ? toText(row[x.field]) : 'unknown',
      y: y ? toNumber(row[y.field]) : 0,
      color: color ? toText(row[color.field]) : null,
      link: hrefField ? findLink(row, /** @type {LinkFieldName} */ (hrefField)) : null
    }));
  }

  /** @type {Map<string, { x: string, color: string | null, values: unknown[], links: Array<{ href: string, label: string }> }>} */
  const groups = new Map();
  for (const row of rows) {
    const xValue = x ? toText(row[x.field]) : 'unknown';
    const colorValue = color ? toText(row[color.field]) : null;
    const key = JSON.stringify([xValue, colorValue]);
    const group = groups.get(key) ?? { x: xValue, color: colorValue, values: [], links: [] };
    group.values.push(y ? row[y.field] : null);
    const link = hrefField ? findLink(row, /** @type {LinkFieldName} */ (hrefField)) : null;
    if (link) group.links.push(link);
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
    const distinctLinks = new Map(group.links.map((link) => [link.href, link]));
    return {
      key: `${pageId}-${title}-${index}`,
      x: group.x,
      y: value,
      color: group.color,
      link: distinctLinks.size === 1 ? distinctLinks.values().next().value ?? null : null
    };
  });
}

/**
 * Applies declarative chart ordering and limiting after aggregation.
 * @param {Array<{ key: string, x: string, y: number, color: string | null, link: { href: string, label: string } | null }>} points
 * @param {Record<string, any> | null} x
 * @param {Record<string, any> | null} y
 * @param {Record<string, any> | null} color
 * @param {unknown} dataConfig
 * @returns {Array<{ key: string, x: string, y: number, color: string | null, link: { href: string, label: string } | null }>}
 */
function prepareChartPoints(points, x, y, color, dataConfig) {
  const prepared = [...points];
  const orderBy = isPlainObject(dataConfig) && Array.isArray(dataConfig['order-by'])
    ? dataConfig['order-by'].filter((item) => isPlainObject(item) && typeof item.field === 'string')
    : [];
  prepared.sort((left, right) => {
    for (const item of orderBy) {
      const comparison = compareTableValues(
        chartPointOutputValue(left, item.field, x, y, color),
        chartPointOutputValue(right, item.field, x, y, color)
      );
      if (comparison !== 0) return item.direction === 'desc' ? -comparison : comparison;
    }
    const xComparison = left.x.localeCompare(right.x);
    return xComparison !== 0 ? xComparison : String(left.color ?? '').localeCompare(String(right.color ?? ''));
  });
  const limit = isPlainObject(dataConfig) && Number.isInteger(dataConfig.limit) && dataConfig.limit > 0
    ? dataConfig.limit
    : null;
  return limit === null ? prepared : prepared.slice(0, limit);
}

/**
 * @param {{ x: string, y: number, color: string | null }} point
 * @param {string} field
 * @param {Record<string, any> | null} x
 * @param {Record<string, any> | null} y
 * @param {Record<string, any> | null} color
 * @returns {string | number | null}
 */
function chartPointOutputValue(point, field, x, y, color) {
  if (field === x?.field || field === x?.as) return point.x;
  const yOutput = typeof y?.as === 'string'
    ? y.as
    : typeof y?.aggregate === 'string' ? `${y.aggregate}-${y.field}` : y?.field;
  if (field === y?.field || field === yOutput) return point.y;
  if (field === color?.field || field === color?.as) return point.color;
  return null;
}

/**
 * @param {Array<{ x: string, link: { href: string, label: string } | null }>} points
 * @returns {Map<string, { href: string, label: string }>}
 */
function chartCategoryLinks(points) {
  const links = new Map();
  const ambiguous = new Set();
  for (const point of points) {
    if (!point.link || ambiguous.has(point.x)) continue;
    const existing = links.get(point.x);
    if (existing && existing.href !== point.link.href) {
      links.delete(point.x);
      ambiguous.add(point.x);
    } else {
      links.set(point.x, point.link);
    }
  }
  return links;
}

/**
 * @param {string} chartType
 * @param {Array<{ x: string, y: number, color: string | null }>} points
 * @param {Array<{ name: string, className: string }>} series
 * @param {{ entries: Array<[string, number]>, total: number } | null} [pieSummary]
 * @param {string} [totalLabel]
 * @returns {HTMLElement}
 */
function renderChartWidget(chartType, points, series, pieSummary = null, totalLabel = 'Total') {
  if (chartType === 'pie') {
    const { entries, total } = pieSummary ?? pieChartEntries(points);
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
            className: `pie-chart-segment chart-series-${(index % 6) + 1}`,
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
        }),
        h('text', { className: 'pie-chart-total-value', x: 21, y: 20, 'text-anchor': 'middle', 'aria-hidden': 'true' }, formatNumber(total)),
        h('text', { className: 'pie-chart-total-label', x: 21, y: 25.5, 'text-anchor': 'middle', 'aria-hidden': 'true' }, totalLabel)
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
    const gridLines = [4, 21, 38].map((y) => h('line', { className: 'line-chart-grid', x1: 0, y1: y, x2: 100, y2: y }));
    return h(
      'div',
      { className: 'chart-widget line-chart-widget', 'data-chart-widget': 'line' },
      h(
        'svg',
        { viewBox: '0 0 100 42', role: 'img', 'aria-label': `Line chart with ${points.length} points` },
        ...gridLines,
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
      ),
      xValues.length > 0
        ? h(
          'div',
          { className: 'chart-axis', 'data-chart-axis': 'line' },
          h('span', null, xValues[0]),
          xValues.length > 1 ? h('span', null, xValues[xValues.length - 1]) : null
        )
        : null
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
 * Derives organization/repository/workflow GitHub links for every row that
 * exposes sufficient GitHub identity but does not already carry an explicit
 * relation-specific link field, so every GitHub-addressable entity can be
 * rendered as a link (Section 9.2 DLS-LINK-006/DLS-LINK-007).
 * @param {Record<string, LogicalSourceInput>} sources
 * @param {string} githubUrlBase
 * @returns {Record<string, LogicalSourceInput>}
 */
function deriveEntityLinkSources(sources, githubUrlBase) {
  return Object.fromEntries(Object.entries(sources).map(([name, source]) => [
    name,
    {
      ...source,
      rows: Array.isArray(source?.rows) ? source.rows.map((row) => deriveEntityLinkRow(row, githubUrlBase)) : source?.rows
    }
  ]));
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} githubUrlBase
 * @returns {Record<string, unknown>}
 */
function deriveEntityLinkRow(row, githubUrlBase) {
  const organization = trimmedString(row.organization);
  const repository = trimmedString(row.repository);
  const workflow = trimmedString(row.workflow);
  // The `repository` field is documented as retaining its domain syntax (Section 9.2), so it may
  // already be a fully-qualified `owner/repo` slug or just the bare repository name.
  const repositorySlug = repository && repository.includes('/') ? repository : (organization && repository ? `${organization}/${repository}` : null);
  /** @type {Record<string, unknown>} */
  const derived = {};

  if (organization && !findLink(row, 'organization-link')) {
    derived['organization-link'] = {
      relation: 'organization',
      href: `${githubUrlBase}/${organization}`,
      label: `View ${organization} on GitHub`
    };
  }
  if (repositorySlug && !findLink(row, 'repository-link')) {
    derived['repository-link'] = {
      relation: 'repository',
      href: `${githubUrlBase}/${repositorySlug}`,
      label: `View ${repositorySlug} on GitHub`
    };
  }
  if (repositorySlug && workflow && !findLink(row, 'workflow-link')) {
    const workflowPath = workflow.replace(/^\/+/, '');
    derived['workflow-link'] = {
      relation: 'workflow',
      href: `${githubUrlBase}/${repositorySlug}/blob/HEAD/${workflowPath}`,
      label: `View ${workflow} on GitHub`
    };
  }

  return Object.keys(derived).length > 0 ? { ...row, ...derived } : row;
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function trimmedString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function toText(value) {
  return value == null || value === '' ? 'unknown' : String(value);
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
