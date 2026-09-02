import { tidy } from './data-operations.js';
import { logDashboardEvent } from './diagnostics.js';

/** @type {Worker | null} */
let worker = null;
let nextRequestId = 0;
let loggedUnavailableWorker = false;
/** @type {Map<number, { resolve: (value: Array<Record<string, unknown>>) => void, reject: (reason: Error) => void }>} */
const pending = new Map();

/**
 * Runs a serializable tidy pipeline in a Web Worker when the environment supports it.
 * @param {Array<Record<string, unknown>>} data
 * @param {Parameters<typeof tidy>[1]} operators
 * @returns {Array<Record<string, unknown>>|Promise<Array<Record<string, unknown>>>}
 */
export function processRows(data, operators) {
  const processor = getWorker();
  if (!processor) {
    if (!loggedUnavailableWorker) {
      loggedUnavailableWorker = true;
      logDashboardEvent('debug', 'worker.unavailable');
    }
    return tidy(data, operators);
  }
  const id = ++nextRequestId;
  logDashboardEvent('debug', 'worker.request', {
    requestId: id,
    inputRows: data.length,
    operatorCount: operators.length,
  });
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    processor.postMessage({ id, data, operators });
  }).then((rows) => {
    logDashboardEvent('debug', 'worker.response', { requestId: id, outputRows: rows.length });
    return rows;
  }).catch(() => {
    logDashboardEvent('warning', 'worker.fallback', { requestId: id, inputRows: data.length });
    return tidy(data, operators);
  });
}

/** @returns {Worker | null} */
function getWorker() {
  if (worker) return worker;
  if (typeof Worker === 'undefined' || import.meta.url.startsWith('data:')) return null;
  worker = new Worker(new URL('./data-worker.js', import.meta.url), { type: 'module' });
  logDashboardEvent('debug', 'worker.ready');
  worker.addEventListener('message', (event) => {
    const request = pending.get(event.data?.id);
    if (!request) return;
    pending.delete(event.data.id);
    if (typeof event.data.error === 'string') request.reject(new Error(event.data.error));
    else request.resolve(event.data.data);
  });
  worker.addEventListener('error', (event) => {
    logDashboardEvent('warning', 'worker.failure', { pendingRequestCount: pending.size });
    for (const request of pending.values()) request.reject(new Error(event.message || 'Data worker failed.'));
    pending.clear();
    worker?.terminate();
    worker = null;
  });
  return worker;
}
