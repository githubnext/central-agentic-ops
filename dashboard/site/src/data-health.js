/**
 * Derived data-shape and retention diagnostics for the dashboard cache.
 */

import { SOURCE_FIELDS } from './specification.js';

/**
 * @typedef {import('./presenter.js').LogicalSourceInput} LogicalSourceInput
 * @typedef {import('./presenter.js').SourceMetadata} SourceMetadata
 */

/**
 * @param {Record<string, LogicalSourceInput>} sources
 * @returns {Record<string, LogicalSourceInput>}
 */
export function deriveDataHealthSources(sources) {
  const sourceRows = Object.entries(sources).map(([name, source]) => {
    const rows = Array.isArray(source?.rows) ? source.rows : [];
    const observedFields = new Set(rows.flatMap((row) => Object.keys(row ?? {})));
    const fields = new Set(SOURCE_FIELDS[name] ?? observedFields);
    const populatedFields = [...fields].filter((field) => rows.some((row) => row?.[field] !== null && row?.[field] !== undefined && row?.[field] !== ''));
    const populatedCells = rows.reduce(
      (total, row) => total + [...fields].filter((field) => row?.[field] !== null && row?.[field] !== undefined && row?.[field] !== '').length,
      0
    );
    const cells = rows.length * fields.size;
    const metadata = source?.metadata ?? {};
    const status = metadata.availability === 'unavailable'
      ? 'unavailable'
      : metadata.availability === 'empty'
        ? 'empty'
        : metadata.completeness !== 'complete' || metadata.freshness !== 'fresh'
        ? 'degraded'
        : 'healthy';
    return {
      source: name,
      'source-id': metadata['source-id'] ?? name,
      'source-kind': metadata['source-kind'] ?? 'unknown',
      'as-of': metadata['as-of'] ?? '',
      'retrieved-at': metadata['retrieved-at'] ?? '',
      rows: rows.length,
      fields: fields.size,
      'populated-fields': populatedFields.length,
      'empty-fields': fields.size - populatedFields.length,
      'populated-cells': populatedCells,
      'empty-cells': cells - populatedCells,
      'field-coverage': fields.size === 0 ? '—' : formatPercent(populatedFields.length / fields.size),
      'cell-coverage': cells === 0 ? '—' : formatPercent(populatedCells / cells),
      status,
      completeness: metadata.completeness ?? 'unknown',
      freshness: metadata.freshness ?? 'unknown'
    };
  });
  const healthy = sourceRows.filter((row) => row.status === 'healthy').length;
  const degraded = sourceRows.filter((row) => row.status === 'degraded').length;
  const empty = sourceRows.filter((row) => row.status === 'empty').length;
  const unavailable = sourceRows.filter((row) => row.status === 'unavailable').length;
  const totalRows = sourceRows.reduce((total, row) => total + row.rows, 0);
  const attention = degraded + empty + unavailable;
  const metadata = combineSourceMetadata(Object.values(sources));
  return {
    ...sources,
    'data-health-summary': {
      source: 'data-health-summary',
      rows: [
        { label: 'Logical sources', value: String(sourceRows.length) },
        { label: 'Healthy sources', value: String(healthy) },
        { label: 'Sources needing attention', value: String(attention) },
        { label: 'Retained rows', value: String(totalRows) }
      ],
      metadata
    },
    'data-health-sources': {
      source: 'data-health-sources',
      rows: sourceRows,
      metadata
    }

    /**
     * @param {number} value
     */
    function formatPercent(value) {
      return `${Math.round(value * 100)}%`;
    }
  };
}

/**
 * @param {LogicalSourceInput[]} sources
 * @returns {SourceMetadata}
 */
function combineSourceMetadata(sources) {
  const metadata = sources.map((source) => source?.metadata).filter(Boolean);
  const retrieved = metadata.map((value) => value['retrieved-at']).filter(Boolean).sort().at(-1);
  return {
    'source-id': 'data-health',
    'source-kind': 'derived',
    'as-of': retrieved ?? new Date().toISOString(),
    'retrieved-at': retrieved ?? new Date().toISOString(),
    completeness: metadata.some((value) => value.completeness === 'partial') ? 'partial' : metadata.length > 0 && metadata.every((value) => value.completeness === 'complete') ? 'complete' : 'unknown',
    freshness: metadata.some((value) => value.freshness === 'stale') ? 'stale' : metadata.length > 0 && metadata.every((value) => value.freshness === 'fresh') ? 'fresh' : 'unknown',
    availability: metadata.some((value) => value.availability === 'unavailable') ? 'unavailable' : metadata.length > 0 && metadata.every((value) => value.availability === 'available') ? 'available' : 'empty'
  };
}
