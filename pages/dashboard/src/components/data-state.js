/**
 * GitHub Primer data-state metrics card grid component.
 */

import { h } from '../dom.js';
import { renderStatusBadge } from './badge.js';

/**
 * @typedef {import("../renderer.js").DataState} EffectiveDataState
 */

/**
 * @param {EffectiveDataState | undefined} effectiveState
 * @returns {HTMLElement}
 */
export function renderDataStateMetrics(effectiveState) {
  const availability = effectiveState?.availability ?? 'available';
  const completeness = effectiveState?.completeness ?? 'complete';
  const freshness = effectiveState?.freshness ?? 'fresh';

  return h(
    'dl',
    { className: 'data-state-summary metrics' },
    h(
      'div',
      { className: 'metric-card' },
      h('dt', { className: 'metric-label' }, 'Availability'),
      h(
        'dd',
        { className: 'metric-value', 'data-state-axis': 'availability' },
        renderStatusBadge(availability),
      ),
    ),
    h(
      'div',
      { className: 'metric-card' },
      h('dt', { className: 'metric-label' }, 'Completeness'),
      h(
        'dd',
        { className: 'metric-value', 'data-state-axis': 'completeness' },
        renderStatusBadge(completeness),
      ),
    ),
    h(
      'div',
      { className: 'metric-card' },
      h('dt', { className: 'metric-label' }, 'Freshness'),
      h(
        'dd',
        { className: 'metric-value', 'data-state-axis': 'freshness' },
        renderStatusBadge(freshness),
      ),
    ),
  );
}
