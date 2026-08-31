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
});
