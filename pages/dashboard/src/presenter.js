/**
 * Presenter for JSON-driven dashboard pages using GitHub Primer styling and elements.
 */

import builtInDashboard from '../dashboard.json' with { type: 'json' };
import { h } from './dom.js';
import { getPrimerStyles } from './styles.js';
import { octicon, agenticWorkflowMark } from './octicons.js';
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
const BUILT_IN_PAGE_PAYLOADS = Object.fromEntries(
  builtInDashboard.dashboard.pages.map((page) => [
    page.page,
    {
      id: page.id,
      kind: 'custom',
      title: page.title,
      description: page.description,
      views: page.definition.views
    }
  ])
);

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
  const renderedViews = views.map((view, index) => {
    const rendered = renderCustomView(page.id, view, index, sources);
    const layout = isPlainObject(view) && typeof view.layout === 'string' ? view.layout : 'full';
    rendered.classList.add('custom-view');
    rendered.setAttribute('data-view-layout', layout);
    return rendered;
  });

  return h(
    'section',
    { className: 'dashboard-page', id: `page-${page.id}`, 'data-page-kind': 'custom', 'data-page-id': page.id },
    h('h2', null, title),
    ...(renderedViews.length > 0
      ? [h('div', { className: 'custom-view-grid' }, ...renderedViews)]
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
  const chartType = typeof view.chart === 'string' ? view.chart : chartDefault;

  const points = rows.map((row, rowIndex) => ({
    key: `${pageId}-${title}-${rowIndex}`,
    x: x ? toText(row[x.field]) : 'unknown',
    y: y ? (typeof y.aggregate === 'string' && y.aggregate === 'count' ? 1 : toNumber(row[y.field])) : 0,
    color: color ? toText(row[color.field]) : null
  }));
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
            'aria-label': `${label}: ${formatNumber(value)}`
          });
          offset += percent;
          return segment;
        })
      )
    );
  }

  if (chartType === 'line') {
    const values = points.map((point) => toNumber(point.y));
    const finiteValues = values.filter(Number.isFinite);
    const maximum = Math.max(...finiteValues, 1);
    const coordinates = values.map((value, index) => {
      const x = values.length < 2 ? 50 : (index / (values.length - 1)) * 100;
      const y = 38 - (Math.max(0, value) / maximum) * 34;
      return `${x},${y}`;
    }).join(' ');
    return h(
      'div',
      { className: 'chart-widget line-chart-widget', 'data-chart-widget': 'line' },
      h(
        'svg',
        { viewBox: '0 0 100 42', role: 'img', 'aria-label': `Line chart with ${points.length} points` },
        h('line', { className: 'line-chart-axis', x1: 0, y1: 38, x2: 100, y2: 38 }),
        h('polyline', { className: 'line-chart-series', points: coordinates, fill: 'none' })
      )
    );
  }

  return h('div', { className: 'chart-widget bar-chart-widget', 'data-chart-widget': 'bar' });
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
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
