// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { modeBadgeClassName, renderModeBadge } from '../../src/components/badge.js';

describe('badge', () => {
  it('maps normalized mode labels to the shared mode-badge class suffix', () => {
    expect(modeBadgeClassName('live')).toBe('mode-live');
    expect(modeBadgeClassName('review')).toBe('mode-review');
    expect(modeBadgeClassName('unknown')).toBe('');
  });

  it('renders a mode badge using the shared class name mapping', () => {
    const live = renderModeBadge('Live');
    expect(live.className).toBe('mode-badge mode-live');
    expect(live.textContent).toBe('Live');

    const review = renderModeBadge('review');
    expect(review.className).toBe('mode-badge mode-review');

    const fallback = renderModeBadge(null);
    expect(fallback.className).toBe('mode-badge');
    expect(fallback.textContent).toBe('unknown');
  });
});
