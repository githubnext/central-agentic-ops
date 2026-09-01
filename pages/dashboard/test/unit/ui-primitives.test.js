// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { formatUtcDateTime, renderInlineNotice, renderSectionHeading, renderVitalStat } from '../../src/components/ui-primitives.js';

describe('ui primitives', () => {
  it('renders shared section-heading markup with configurable heading levels', () => {
    const rendered = renderSectionHeading({
      kicker: 'Current decision window',
      id: 'overview-heading',
      title: 'Overview',
      description: 'Daily status',
      summary: '3 signals',
      headingTag: 'h2'
    });

    expect(rendered.className).toBe('section-heading');
    expect(rendered.querySelector('.scope-kicker')?.textContent).toBe('Current decision window');
    expect(rendered.querySelector('h2')?.id).toBe('overview-heading');
    expect(rendered.querySelector('h2')?.textContent).toBe('Overview');
    expect(rendered.querySelector('p')?.textContent).toBe('Daily status');
    expect(rendered.querySelector('strong')?.textContent).toBe('3 signals');
  });

  it('omits the summary node when no summary is provided', () => {
    const rendered = renderSectionHeading({
      kicker: 'Workflow topology',
      id: 'topology-heading',
      title: 'Orchestrator and workers'
    });

    expect(rendered.querySelector('h3')?.textContent).toBe('Orchestrator and workers');
    expect(rendered.querySelector('strong')).toBeNull();
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

  it('renders an inline notice with note semantics', () => {
    const icon = document.createElement('svg');
    const rendered = renderInlineNotice(icon, 'Statistical anomalies · not evaluated', 'Baseline unavailable.');

    expect(rendered.className).toBe('inline-notice');
    expect(rendered.getAttribute('role')).toBe('note');
    expect(rendered.querySelector('svg')).toBe(icon);
    expect(rendered.querySelector('strong')?.textContent).toBe('Statistical anomalies · not evaluated');
    expect(rendered.querySelector('p')?.textContent).toBe('Baseline unavailable.');
  });

  it('formats UTC date-time text and preserves the unavailable fallback', () => {
    expect(formatUtcDateTime('2026-08-30T10:00:00Z')).toBe('Aug 30, 2026, 10:00 AM');
    expect(formatUtcDateTime('not-a-date')).toBe('Time unavailable');
  });
});
