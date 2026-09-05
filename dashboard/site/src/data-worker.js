import { tidy } from './data-operations.js';
import { summarizeTableColumns } from './table-summary-data.js';
import { clusterScatterPoints } from './scatter-clustering.js';

/**
 * @param {{ operation?: unknown, data?: unknown, operators?: unknown, columns?: unknown, limit?: unknown }} request
 * @returns {unknown}
 */
export function processDataRequest(request) {
  if (request?.operation === 'summarize-table-columns') {
    if (!Array.isArray(request.columns)) {
      throw new TypeError('Table summary requests require a columns array.');
    }
    return summarizeTableColumns(request.columns);
  }
  if (request?.operation === 'cluster-scatter-points') {
    if (!Array.isArray(request.data)) {
      throw new TypeError('Scatter clustering requests require a data array.');
    }
    return clusterScatterPoints(request.data, Number(request.limit));
  }
  if (!Array.isArray(request?.data) || !Array.isArray(request?.operators)) {
    throw new TypeError('Data worker requests require data and operators arrays.');
  }
  return tidy(request.data, request.operators);
}

if (typeof document === 'undefined' && typeof self !== 'undefined' && 'postMessage' in self) {
  self.addEventListener('message', (event) => {
    const id = event.data?.id;
    try {
      self.postMessage({ id, data: processDataRequest(event.data) });
    } catch (error) {
      self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
    }
  });
}
