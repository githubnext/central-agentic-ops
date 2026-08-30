/**
 * Presenter for JSON-driven dashboard pages using GitHub Primer styling and elements.
 */

import builtInDashboard from '../dashboard.json' with { type: 'json' };
import { h } from './dom.js';
import { getPrimerStyles } from './styles.js';
import { octicon, agenticWorkflowMark } from './octicons.js';
import { renderDataStateMetrics } from './components/data-state.js';
import { renderTableRegion } from './components/table-region.js';
import { renderContextList, renderPageSection, renderViewHeader } from './components/view-chrome.js';

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


/** @type {Record<string, PresentableCustomPage>} */
const BUILT_IN_PAGE_PAYLOADS = /** @type {Record<string, PresentableCustomPage>} */ (Object.fromEntries(
  builtInDashboard.dashboard.pages.map((page) => [
    page.page,
    {
      id: page.id,
      kind: 'custom',
      title: page.title,
      description: 'description' in page ? page.description : undefined,
      views: page.definition.views
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
    views: payload?.views ?? []
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

  const sidebar = renderSidebar(document, pages, orgName);
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
  /** @type {Map<string, LogicalSourceInput>} */
  const pageSources = new Map();
  for (const view of views) {
    const sourceName = getViewSource(view);
    if (sourceName && sources[sourceName]) {
      pageSources.set(sourceName, sources[sourceName]);
    }

  }
  const renderedViews = views.map((view, index) => {
    const rendered = renderCustomView(page.id, view, index, sources);
    const layout = isPlainObject(view) && typeof view.layout === 'string' ? view.layout : 'full';
    rendered.classList.add('custom-view');
    rendered.setAttribute('data-view-layout', layout);
    return rendered;
  });

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
    renderDataStateMetrics(summarizeDataState(pageSources)),
    ...(renderedViews.length > 0
      ? [h('div', { className: 'custom-view-grid' }, ...renderedViews)]
      : [h('p', null, 'No custom views available.')])
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
    return renderCustomViewState(pageId, title, sourceName, state, contextDetails);
  }

  if (filteredRows.length === 0) {
    return renderCustomViewState(pageId, title, sourceName, 'empty', contextDetails);
  }

  if (view.mark === 'metric') {
    return renderMetricView(pageId, title, view, sourceName, filteredRows, metadata, contextDetails);
  }
  if (view.mark === 'table') {
    return renderTableView(pageId, title, view, sourceName, filteredRows, metadata, contextDetails);
  }
  if (view.mark === 'chart') {
    return renderChartView(pageId, title, view, sourceName, filteredRows, metadata, contextDetails);
  }

  return renderCustomViewState(pageId, title, sourceName, 'unavailable', [...contextDetails, 'Unsupported view mark.']);
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
              return h('td', null, value, link ? ' ' : null, link ? renderExternalLink(link) : null);
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
  const chartType = typeof view.chart === 'string' ? view.chart : chartDefault;

  const points = buildChartPoints(pageId, title, rows, x, y, color);
  const colorCategories = color
    ? [...new Set(points.map((point) => point.color ?? 'unknown'))].sort((left, right) => left.localeCompare(right))
    : [];

  return renderPageSection(pageId, title, [
    ...renderViewHeader(sourceName, metadata),
    h(
      'p',
      { className: 'chart-default', 'data-chart-default': chartDefault, 'data-chart-type': chartType },
      typeof view.chart === 'string' ? `Chart type: ${chartType}` : `Default chart type: ${chartDefault}`
    ),
    ...(color
      ? [h(
        'p',
        { className: 'chart-legend-text', 'data-chart-legend': 'text' },
        `Color categories: ${colorCategories.length > 0 ? colorCategories.join(', ') : 'unknown'}`
      )]
      : []),
    renderChartWidget(chartType, points),
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
 * @returns {HTMLElement}
 */
function renderChartWidget(chartType, points) {
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
    const series = groupChartSeries(points);
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
        ...series.flatMap(([seriesName, seriesPoints], seriesIndex) => {
          const coordinates = seriesPoints.map((point) => {
            const xIndex = xValues.indexOf(point.x);
            const x = xValues.length < 2 ? 50 : (xIndex / (xValues.length - 1)) * 100;
            const y = 38 - (Math.max(0, point.y) / maximum) * 34;
            return { point, x, y };
          });
          return [
            h('polyline', {
              className: `line-chart-series chart-series-${(seriesIndex % 5) + 1}`,
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
              className: `line-chart-point chart-series-${(seriesIndex % 5) + 1}`,
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
  const seriesIndexes = new Map(
    [...new Set(points.map((point) => point.color ?? 'value'))]
      .sort((left, right) => left.localeCompare(right))
      .map((name, index) => [name, index])
  );
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
          className: `bar-chart-bar chart-series-${((seriesIndexes.get(point.color ?? 'value') ?? 0) % 5) + 1}`,
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
 * @param {unknown} value
 * @returns {number}
 */
function toNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * @param {number} value
 * @returns {string}
 */
function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
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
