// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { formatUtcDateTime, renderSectionHeading, renderVitalStat } from '../../src/components/ui-primitives.js';

describe('ui primitives', () => {
  it('renders shared section-heading markup with configurable heading levels', () => {
    const rendered = renderSectionHeading('Current decision window', 'overview-heading', 'Overview', 'Daily status', '3 signals', 'h2');

    expect(rendered.className).toBe('section-heading');
    expect(rendered.querySelector('.scope-kicker')?.textContent).toBe('Current decision window');
    expect(rendered.querySelector('h2')?.id).toBe('overview-heading');
    expect(rendered.querySelector('h2')?.textContent).toBe('Overview');
    expect(rendered.querySelector('p')?.textContent).toBe('Daily status');
    expect(rendered.querySelector('strong')?.textContent).toBe('3 signals');
  });

  it('renders shared vital stats with and without detail text', () => {
    const withDetail = renderVitalStat('Root episodes', 4, 'observed orchestrator runs');
    const withoutDetail = renderVitalStat('Measured AIC', '—');

    expect(withDetail.textContent).toBe('Root episodes4observed orchestrator runs');
    expect(withDetail.querySelector('dt')?.textContent).toBe('Root episodes');
    expect(withDetail.querySelector('dd')?.textContent).toBe('4');
    expect(withDetail.querySelector('p')?.textContent).toBe('observed orchestrator runs');
    expect(withoutDetail.textContent).toBe('Measured AIC—');
    expect(withoutDetail.querySelector('p')).toBeNull();
  });

  it('formats UTC date-time text and preserves the unavailable fallback', () => {
    expect(formatUtcDateTime('2026-08-30T10:00:00Z')).toBe('Aug 30, 2026, 10:00 AM');
    expect(formatUtcDateTime('not-a-date')).toBe('Time unavailable');
  });
});
