/**
 * Reusable GitHub Primer status and mode badges.
 */

import { h } from '../dom.js';

/**
 * @param {unknown} status
 * @returns {HTMLElement}
 */
export function renderStatusBadge(status) {
  const text = status == null || status === '' ? 'unknown' : String(status);
  const normalized = text.toLowerCase();
  let statusClass = 'status-muted';

  if (['success', 'completed', 'active', 'true', 'fresh', 'available', 'complete', 'accepted', 'matured', 'closed', 'resolved'].includes(normalized)) {
    statusClass = 'status-success';
  } else if (['in-progress', 'running', 'pending', 'review', 'partial', 'stale', 'attention', 'warning', 'action-required', 'interim'].includes(normalized)) {
    statusClass = 'status-attention';
  } else if (['failure', 'failed', 'rejected', 'danger', 'unavailable', 'critical', 'timed-out', 'startup-failure'].includes(normalized)) {
    statusClass = 'status-danger';
  }

  return h('span', { className: `status ${statusClass}` }, text);
}

/**
 * @param {unknown} status
 * @returns {HTMLElement}
 */
export function renderGraderStatusBadge(status) {
  const text = status == null || status === '' ? 'unavailable' : String(status);
  const normalized = text.toLowerCase();
  const statusClass = normalized === 'pass'
    ? 'status-success'
    : ['fail', 'error'].includes(normalized) ? 'status-danger' : 'status-attention';
  return h('span', { className: `status ${statusClass}` }, text);
}

/**
 * @param {unknown} mode
 * @returns {HTMLElement}
 */
export function renderModeBadge(mode) {
  const text = mode == null || mode === '' ? 'unknown' : String(mode);
  const normalized = text.toLowerCase();
  const modeClass = normalized === 'live' ? 'mode-live' : normalized === 'review' ? 'mode-review' : '';

  return h('span', { className: `mode-badge ${modeClass}`.trim() }, text);
}

/**
 * @param {unknown} active
 * @returns {HTMLElement}
 */
export function renderActiveStateBadge(active) {
  const text = String(active);
  const isActive = text === 'true' || text === 'active';
  const statusClass = isActive ? 'status-success' : 'status-muted';

  return h('span', { className: `status ${statusClass}` }, text);
}
