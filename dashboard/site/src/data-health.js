/**
 * Derived data-shape and retention diagnostics for the dashboard cache.
 */

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
    const fields = new Set(rows.flatMap((row) => Object.keys(row ?? {})));
    const populatedFields = [...fields].filter((field) => rows.some((row) => row?.[field] !== null && row?.[field] !== undefined && row?.[field] !== ''));
    const metadata = source?.metadata ?? {};
    const status = metadata.availability === 'unavailable'
      ? 'unavailable'
      : metadata.completeness === 'partial' || metadata.freshness === 'stale'
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
      status,
      completeness: metadata.completeness ?? 'unknown',
      freshness: metadata.freshness ?? 'unknown'
    };
  });
  const healthy = sourceRows.filter((row) => row.status === 'healthy').length;
  const degraded = sourceRows.filter((row) => row.status === 'degraded').length;
  const unavailable = sourceRows.filter((row) => row.status === 'unavailable').length;
  const totalRows = sourceRows.reduce((total, row) => total + row.rows, 0);
  const metadata = combineSourceMetadata(Object.values(sources));
  return {
    ...sources,
    'data-health-summary': {
      source: 'data-health-summary',
      rows: [
        { label: 'Logical sources', value: String(sourceRows.length) },
        { label: 'Healthy sources', value: String(healthy) },
        { label: 'Degraded sources', value: String(degraded) },
        { label: 'Unavailable sources', value: String(unavailable) },
        { label: 'Retained rows', value: String(totalRows) }
      ],
      metadata
    },
    'data-health-sources': {
      source: 'data-health-sources',
      rows: sourceRows,
      metadata
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
