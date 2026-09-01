/**
 * Generic renderers for JSON-selected metric, table, and chart views.
 */

import { h } from '../dom.js';
import { formatAggregateValue, formatNumber } from '../view-formatters.js';
import { renderCellDisplay } from './cell-display.js';
import { listChartSeries, pieChartEntries, renderChartLegend, renderPieLegend, renderChartWidget } from './chart-elements.js';
import { findFirstLink, findLink, renderExternalLink, renderLinkedValueWithExternalLink, renderWorkflowRunLink } from './link-content.js';
import { createEntityAwareCellRenderer, renderLinkedText } from './linked-text.js';
import { renderTableRegion } from './table-region.js';
import { renderPageSection, renderViewSectionChrome } from './view-chrome.js';

/** @type {Record<string, 'organization-link'|'repository-link'|'workflow-link'>} */
const ENTITY_LINK_FIELDS = {
  organization: 'organization-link',
  repository: 'repository-link',
  workflow: 'workflow-link',
  'runtime-repository': 'repository-link',
  'workflow-name': 'workflow-link'
};
const RUN_FIELD = 'run';
const RUN_LINK_FIELD = 'run-link';

/**
 * @typedef {{ field: string, aggregate?: string, as?: string, direction?: string, display?: string } & Record<string, unknown>} TableField
 */

/**
 * @typedef {{
 *   pageId: string,
 *   title: string,
 *   view: Record<string, any>,
 *   sourceName: string,
 *   rows: Array<Record<string, unknown>>,
 *   metadata: import('../presenter.js').SourceMetadata,
 *   contextDetails: string[],
 *   headingTag: 'h3'|'h4',
 *   units?: Record<string, { name: string, symbol: string, significant: number }>,
 *   prepareTableRows: (rows: Array<Record<string, unknown>>, columns: TableField[], data: unknown) => Array<Record<string, unknown>>,
 *   buildChartPoints: (pageId: string, title: string, rows: Array<Record<string, unknown>>, x: Record<string, any> | null, y: Record<string, any> | null, color: Record<string, any> | null, hrefField: string | null) => Array<{ key: string, x: string, y: number, color: string | null, link: { href: string, label: string } | null }>,
 *   prepareChartPoints: (points: Array<{ key: string, x: string, y: number, color: string | null, link: { href: string, label: string } | null }>, x: Record<string, any> | null, y: Record<string, any> | null, color: Record<string, any> | null, data: unknown) => Array<{ key: string, x: string, y: number, color: string | null, link: { href: string, label: string } | null }>,
 *   toText: (value: unknown) => string
 * }} DataViewContext
 */

/** @type {Map<string, (context: DataViewContext) => HTMLElement>} */
const DATA_VIEW_RENDERERS = new Map([
  ['metric', renderMetricView],
  ['table', renderTableView],
  ['chart', renderChartView]
]);

/**
 * Renders a view using the renderer selected by its JSON `mark`.
 * @param {string} mark
 * @param {DataViewContext} context
 * @returns {HTMLElement | null}
 */
export function renderDataView(mark, context) {
  return DATA_VIEW_RENDERERS.get(mark)?.(context) ?? null;
}

/** @param {DataViewContext} context */
function renderMetricView(context) {
  const { pageId, title, view, rows, metadata, contextDetails, headingTag, toText, units = {} } = context;
  const valueDefinition = isPlainObject(view.encoding) && isPlainObject(view.encoding.value)
    ? view.encoding.value
    : null;
  const fieldName = typeof valueDefinition?.field === 'string' ? valueDefinition.field : null;
  const aggregate = typeof valueDefinition?.aggregate === 'string' ? valueDefinition.aggregate : 'none';
  const hrefDefinition = isPlainObject(view.encoding) && isPlainObject(view.encoding.href)
    ? view.encoding.href
    : null;
  const hrefField = typeof hrefDefinition?.field === 'string' ? hrefDefinition.field : null;
  const link = hrefField ? findFirstLink(rows, hrefField) : null;
  const valueText = formatAggregateValue(rows, fieldName, aggregate, toText, fieldUnit(valueDefinition, units));
  const content = [
    ...renderViewSectionChrome(metadata, contextDetails),
    h('p', { className: 'metric-value', 'data-metric-value': fieldName ?? 'unknown' }, valueText)
  ];
  if (link) {
    content.push(h('p', { className: 'metric-link' }, renderExternalLink(link)));
  }
  return renderPageSection(pageId, title, content, headingTag);
}

/** @param {DataViewContext} context */
function renderTableView(context) {
  const { pageId, title, view, rows, metadata, contextDetails, headingTag, prepareTableRows, toText, units = {} } = context;
  const columns = /** @type {TableField[]} */ (isPlainObject(view.encoding) && Array.isArray(view.encoding.columns)
    ? view.encoding.columns.filter((column) => isPlainObject(column) && typeof column.field === 'string')
    : []);
  const hrefDefinition = isPlainObject(view.encoding) && isPlainObject(view.encoding.href)
    ? view.encoding.href
    : null;
  const hrefField = typeof hrefDefinition?.field === 'string' ? hrefDefinition.field : null;
  const tableRows = prepareTableRows(rows, columns, view.data);
  const renderCellValue = createEntityAwareCellRenderer(
    hrefField
      ? {
          organization: ENTITY_LINK_FIELDS.organization,
          repository: ENTITY_LINK_FIELDS.repository,
          workflow: ENTITY_LINK_FIELDS.workflow
        }
      : ENTITY_LINK_FIELDS,
    findLink,
    (display, value, column) => renderCellDisplay(
      display,
      value,
      toText,
      fieldUnit(column, units),
      typeof column === 'string' ? undefined : column.type
    ),
    toText
  );
  const bodyRows = tableRows.map((row, rowIndex) => h(
    'tr',
    { 'data-custom-row-key': `${pageId}-${title}-${rowIndex}` },
    ...columns.map((column, columnIndex) => {
      const outputField = typeof column.as === 'string' ? column.as : column.field;
      const value = column.field === RUN_FIELD && !column.aggregate
        ? renderWorkflowRunLink(row, toText(row[outputField]))
        : renderCellValue(column, row[outputField], row);
      if (columnIndex === 0 && hrefField) {
        if (column.field === RUN_FIELD && hrefField === RUN_LINK_FIELD) {
          return h('td', null, value);
        }
        return h('td', null, renderLinkedValueWithExternalLink(value, findLink(row, hrefField)));
      }
      return h('td', null, value);
    })
  ));

  const interactive = view.controls !== 'static';
  return renderPageSection(pageId, title, [
    ...renderViewSectionChrome(metadata, contextDetails),
    renderTableRegion({
      tableClassName: 'custom-table',
      regionClassName: interactive ? undefined : 'table-region-static',
      emptyMessage: typeof view['empty-message'] === 'string' ? view['empty-message'] : 'No rows available.',
      colSpan: Math.max(columns.length, 1),
      headCells: columns.map(fieldTitle),
      summaryColumns: interactive ? columns.map((column) => {
        const outputField = typeof column.as === 'string' ? column.as : column.field;
        return {
          field: outputField,
          label: fieldTitle(column),
          type: String(column.type ?? ''),
          values: tableRows.map((row) => row[outputField])
        };
      }) : [],
      filterLabel: interactive ? `Filter ${title}` : undefined,
      filterId: typeof view.id === 'string' ? view.id : `${pageId}-table`,
      filterFields: columns.flatMap((column, columnIndex) => (
        ['nominal', 'ordinal'].includes(String(column.type))
          ? [{ key: typeof column.as === 'string' ? column.as : column.field, label: fieldTitle(column), columnIndex }]
          : []
      )),
      bodyRows,
      sortable: interactive
    })
  ], headingTag);
}

/** @param {DataViewContext} context */
function renderChartView(context) {
  const { pageId, title, view, rows, metadata, contextDetails, headingTag, buildChartPoints, prepareChartPoints } = context;
  const encoding = isPlainObject(view.encoding) ? view.encoding : null;
  const x = isPlainObject(encoding?.x) && typeof encoding.x.field === 'string' ? encoding.x : null;
  const y = isPlainObject(encoding?.y) && typeof encoding.y.field === 'string' ? encoding.y : null;
  const color = isPlainObject(encoding?.color) && typeof encoding.color.field === 'string' ? encoding.color : null;
  const href = isPlainObject(encoding?.href) && typeof encoding.href.field === 'string' ? encoding.href : null;
  const chartType = typeof view.chart === 'string' ? view.chart : x?.type === 'temporal' ? 'line' : 'bar';
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
  const chartWidget = renderChartWidget(
    chartType,
    points,
    chartSeries,
    pieSummary,
    y ? fieldTitle(y) : 'Total',
    y ? fieldUnit(y, context.units ?? {}) : null
  );
  const table = renderTableRegion({
    tableClassName: 'custom-chart-table',
    emptyMessage: 'No points available.',
    colSpan: color ? 3 : 2,
    headCells: [x ? fieldTitle(x) : 'X', y ? fieldTitle(y) : 'Y', ...(color ? [fieldTitle(color)] : [])],
    bodyRows: points.map((point) => h(
      'tr',
      { 'data-custom-point-key': point.key },
      h('td', null, renderLinkedText(point.x, point.link)),
      h('td', null, y ? formatNumber(point.y, fieldUnit(y, context.units ?? {})) : point.y),
      color ? h('td', null, point.color ?? 'unknown') : null
    ))
  });

  const section = renderPageSection(pageId, title, [
    ...(description ? [description] : []),
    ...renderViewSectionChrome(metadata, contextDetails),
    ...(color && chartType !== 'pie' ? [renderChartLegend(chartSeries, chartType)] : []),
    ...(pieSummary
      ? [h('div', { className: 'pie-chart-layout' }, chartWidget, renderPieLegend(
          pieSummary.entries,
          pieSummary.total,
          chartCategoryLinks(points),
          y ? fieldUnit(y, context.units ?? {}) : null
        ))]
      : [chartWidget]),
    table
  ], headingTag);
  section.classList.add('chart-view', `chart-view-${chartType}`);
  return section;
}

/** @param {Record<string, unknown>} fieldDefinition */
function fieldTitle(fieldDefinition) {
  if (typeof fieldDefinition.title === 'string' && fieldDefinition.title.length > 0) {
    return fieldDefinition.title;
  }
  return typeof fieldDefinition.field === 'string' ? titleCase(fieldDefinition.field) : 'Field';
}

/**
 * @param {unknown} fieldDefinition
 * @param {Record<string, { name: string, symbol: string, significant: number }>} units
 * @returns {{ name: string, symbol: string, significant: number } | null}
 */
function fieldUnit(fieldDefinition, units) {
  return isPlainObject(fieldDefinition) && typeof fieldDefinition.unit === 'string'
    ? units[fieldDefinition.unit] ?? null
    : null;
}

/** @param {Array<{ x: string, link: { href: string, label: string } | null }>} points */
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

/** @param {string} value */
function titleCase(value) {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part[0] ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
    .join(' ');
}

/** @param {unknown} value @returns {value is Record<string, any>} */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
