// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderUiElement } from '../../src/components/ui-elements.js';

const metadata = {
  'source-id': 'signal-fixture',
  'source-kind': 'fixture',
  'as-of': '2026-08-30T12:00:00Z',
  'retrieved-at': '2026-08-30T12:01:00Z',
  completeness: /** @type {'complete'} */ ('complete'),
  freshness: /** @type {'fresh'} */ ('fresh'),
  availability: /** @type {'available'} */ ('available')
};

describe('UI elements', () => {
  it('allows same-document signal navigation and rejects non-fragment URLs', () => {
    const rendered = renderUiElement('signal-list', {
      pageId: 'runtime',
      title: 'Signals',
      sourceNames: ['runtime-signals'],
      sources: {
        'runtime-signals': {
          source: 'runtime-signals',
          rows: [
            { title: 'Safe', 'navigation-href': '#runtime-evidence' },
            { title: 'Unsafe', 'navigation-href': 'javascript:alert(1)' }
          ],
          metadata
        }
      },
      contextDetails: [],
      headingTag: 'h3'
    });

    expect(rendered?.querySelector('a')?.getAttribute('href')).toBe('#runtime-evidence');
    expect(rendered?.querySelectorAll('a')).toHaveLength(1);
  });

  it('renders JSON summary rows and allows only same-document item navigation', () => {
    const rendered = renderUiElement('context-summary', {
      pageId: 'repositories',
      title: 'Repository scope',
      sourceNames: ['repositories', 'repository-summary'],
      sources: {
        repositories: {
          source: 'repositories',
          rows: [{ repository: 'octo/one' }],
          metadata
        },
        'repository-summary': {
          source: 'repository-summary',
          rows: [
            {
              label: 'Repositories',
              items: [
                null,
                { label: 'octo/one', 'navigation-href': '#page-repository-detail?repository=octo%2Fone' },
                { label: 'unsafe', 'navigation-href': 'javascript:alert(1)' }
              ]
            },
            { label: 'Run window', value: 'Complete 24-hour window' }
          ],
          metadata
        }
      },
      contextDetails: [],
      headingTag: 'h3'
    });

    expect(rendered?.getAttribute('aria-label')).toBe('Repository scope');
    expect(rendered?.querySelector('dd')?.textContent).toBe('octo/one, unsafe');
    expect(rendered?.textContent).toContain('Run windowComplete 24-hour window');
    expect(rendered?.querySelectorAll('a')).toHaveLength(1);
    expect(rendered?.querySelector('a')?.getAttribute('href')).toBe('#page-repository-detail?repository=octo%2Fone');
  });

  it('renders populated and empty coverage diagnostics accessibly', () => {
    const context = {
      pageId: 'coverage',
      title: 'Coverage diagnostics',
      description: 'Signals that limit what this dashboard can claim about the configured scope.',
      sourceNames: ['coverage-diagnostics'],
      sources: {
        'coverage-diagnostics': {
          source: 'coverage-diagnostics',
          rows: [
            { title: 'Private repository discovery is off', effect: 'Private repositories are excluded.' },
            { title: 'AIC telemetry is partial', effect: 'Some usage artifacts were not collected.' }
          ],
          metadata
        }
      },
      contextDetails: [],
      headingTag: /** @type {'h3'} */ ('h3')
    };

    const rendered = renderUiElement('coverage-diagnostics', context);
    expect(rendered?.querySelector('.scope-kicker')?.textContent).toBe('Data quality');
    expect(rendered?.querySelector('.section-heading strong')?.textContent).toBe('2 gaps');
    expect(rendered?.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(rendered?.querySelector('tbody th')?.getAttribute('scope')).toBe('row');
    expect(rendered?.querySelector('[role="region"]')?.getAttribute('aria-labelledby')).toBe('coverage-coverage-diagnostics-heading');

    context.sources['coverage-diagnostics'].rows = [];
    const empty = renderUiElement('coverage-diagnostics', context);
    expect(empty?.querySelector('.section-heading strong')?.textContent).toBe('0 gaps');
    expect(empty?.querySelector('tbody td')?.textContent).toBe('No reporting coverage gaps detected.');
    expect(empty?.querySelector('tbody td')?.getAttribute('colspan')).toBe('2');
  });
});
