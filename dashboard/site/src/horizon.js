const HORIZON_PATTERN = /^([1-9][0-9]*)(h|d|w)$/;
const UNIT_HOURS = { h: 1, d: 24, w: 7 * 24 };
const UNIT_LABELS = { h: 'hour', d: 'day', w: 'week' };

export const DEFAULT_DASHBOARD_HORIZON = '1w';

/**
 * @param {unknown} dashboard
 * @returns {string}
 */
export function resolveDashboardHorizon(dashboard) {
  const configured = dashboard && typeof dashboard === 'object'
    ? /** @type {{ defaults?: { time?: { range?: unknown } } }} */ (dashboard).defaults?.time?.range
    : undefined;
  return typeof configured === 'string' && HORIZON_PATTERN.test(configured)
    ? configured
    : DEFAULT_DASHBOARD_HORIZON;
}

/**
 * @param {string} range
 * @returns {number}
 */
export function dashboardHorizonHours(range) {
  const match = HORIZON_PATTERN.exec(range);
  if (!match) throw new Error(`Invalid dashboard horizon: ${range}`);
  const unit = /** @type {'h'|'d'|'w'} */ (match[2]);
  return Number(match[1]) * UNIT_HOURS[unit];
}

/**
 * @param {string} range
 * @returns {string}
 */
export function formatDashboardHorizon(range) {
  const match = HORIZON_PATTERN.exec(range);
  if (!match) return formatDashboardHorizon(DEFAULT_DASHBOARD_HORIZON);
  const count = Number(match[1]);
  const unit = UNIT_LABELS[/** @type {'h'|'d'|'w'} */ (match[2])];
  return `${count} ${unit}${count === 1 ? '' : 's'}`;
}