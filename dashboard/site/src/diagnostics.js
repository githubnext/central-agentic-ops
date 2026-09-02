const LOG_TITLE = 'Central Agentic Ops dashboard';

const KNOWN_EVENTS = new Set([
  'cache.read.failure',
  'cache.read.hit',
  'cache.read.miss',
  'cache.write.failure',
  'cache.write.ready',
  'dashboard.ready',
  'dashboard.start',
  'render.complete',
  'schema.failure',
  'schema.ready',
  'schema.request',
  'source.failure',
  'source.fallback',
  'source.ready',
  'source.request',
  'worker.failure',
  'worker.fallback',
  'worker.ready',
  'worker.request',
  'worker.response',
  'worker.unavailable',
]);

const SAFE_NUMBER_KEYS = new Set([
  'inputRows',
  'operatorCount',
  'outputRows',
  'pageCount',
  'pendingRequestCount',
  'requestId',
  'rowCount',
  'sourceCount',
  'status',
]);

/** @type {Record<string, Set<string>>} */
const SAFE_STRING_VALUES = {
  cache: new Set(['hit', 'miss', 'stored', 'unavailable']),
  mode: new Set(['fixtures', 'live']),
  state: new Set(['cached', 'loading', 'ready']),
};

const LEVELS = {
  debug: '::debug::',
  error: `::error title=${LOG_TITLE}::`,
  info: `::notice title=${LOG_TITLE}::`,
  warning: `::warning title=${LOG_TITLE}::`,
};

/**
 * Emits an agent-readable GitHub log command without including source values,
 * URLs, error messages, or other potentially sensitive data.
 *
 * @param {'debug'|'info'|'warning'|'error'} level
 * @param {string} event
 * @param {Record<string, unknown>} [details]
 */
export function logDashboardEvent(level, event, details = {}) {
  const safeEvent = KNOWN_EVENTS.has(event) ? event : 'dashboard.event';
  const safeDetails = selectSafeDetails(details);
  const suffix = Object.keys(safeDetails).length > 0 ? ` ${JSON.stringify(safeDetails)}` : '';
  const message = `${LEVELS[level]}${safeEvent}${suffix}`;
  if (level === 'debug') console.debug(message);
  else if (level === 'info') console.info(message);
  else if (level === 'warning') console.warn(message);
  else console.error(message);
}

/**
 * Returns counts only; source names, metadata, and row values are never exposed.
 *
 * @param {unknown} sources
 * @returns {{ sourceCount: number, rowCount: number }}
 */
export function summarizeSources(sources) {
  if (!sources || typeof sources !== 'object' || Array.isArray(sources)) {
    return { sourceCount: 0, rowCount: 0 };
  }

  const entries = Object.values(sources);
  return {
    sourceCount: entries.length,
    rowCount: entries.reduce((total, source) => {
      if (!source || typeof source !== 'object' || Array.isArray(source)) return total;
      const rows = /** @type {{ rows?: unknown }} */ (source).rows;
      return total + (Array.isArray(rows) ? rows.length : 0);
    }, 0),
  };
}

/**
 * @param {Record<string, unknown>} details
 * @returns {Record<string, number|string>}
 */
function selectSafeDetails(details) {
  /** @type {Record<string, number|string>} */
  const safe = {};
  for (const [key, value] of Object.entries(details)) {
    if (SAFE_NUMBER_KEYS.has(key) && typeof value === 'number' && Number.isFinite(value)) {
      safe[key] = value;
      continue;
    }
    const allowedValues = SAFE_STRING_VALUES[key];
    if (allowedValues?.has(/** @type {string} */ (value))) {
      safe[key] = /** @type {string} */ (value);
    }
  }
  return safe;
}
