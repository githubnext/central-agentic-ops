import { tidy } from './data-operations.js';

/**
 * @param {{ data: unknown, operators: unknown }} request
 * @returns {Array<Record<string, unknown>>}
 */
export function processDataRequest(request) {
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
