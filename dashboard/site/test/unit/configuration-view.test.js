// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { renderConfigurationView } from '../../src/components/configuration-view.js';

const metadata = /** @type {import('../../src/presenter.js').SourceMetadata} */ ({
  'source-id': 'configuration-fixture',
  'source-kind': 'fixture',
  'as-of': '2026-09-05T09:00:00Z',
  'retrieved-at': '2026-09-05T09:01:00Z',
  completeness: 'complete',
  freshness: 'fresh',
  availability: 'available'
});

/** @param {Record<string, unknown>} row */
function context(row) {
  return /** @type {import('../../src/components/ui-elements.js').ElementRenderContext} */ ({
    pageId: 'configuration',
    title: 'Control policy',
    description: 'Explained configuration.',
    sourceNames: ['configuration-policy'],
    sources: {
      'configuration-policy': {
        source: 'configuration-policy',
        rows: [row],
        metadata
      }
    },
    contextDetails: [],
    headingTag: 'h3'
  });
}

describe('Configuration dashboard view', () => {
  it('keeps Configuration in the Control plane group without a chart', () => {
    const dashboard = JSON.parse(readFileSync(resolve('dashboard.json'), 'utf8')).dashboard;
    const page = dashboard.pages.find((/** @type {{ id: string }} */ candidate) => candidate.id === 'configuration');
    const group = dashboard.navigation.find((/** @type {{ label: string }} */ candidate) => candidate.label === 'Control plane');

    expect(group.pages).toContain('configuration');
    expect(page.views.every((/** @type {{ mark: string }} */ view) => view.mark !== 'chart')).toBe(true);
    expect(page.views).toHaveLength(2);
  });

  it('renders validation guidance, explains entries, and safely renders raw JSON', () => {
    const raw = '{"version":1,"control-plane":{"defaults":{"mode":"review"}}}';
    const rendered = renderConfigurationView(context({
      document: JSON.parse(raw),
      raw,
      diagnostics: [{
        severity: 'guidance',
        title: 'Package is review-only',
        path: 'control-plane.packages.example.mode',
        detail: 'Promote only after reviewing target authority.'
      }]
    }));
    if (!rendered) throw new Error('configuration view did not render');

    expect(rendered.textContent).toContain('Package is review-only');
    expect(rendered.textContent).toContain('Sets the inherited execution mode.');
    expect(rendered.querySelector('.configuration-raw code')?.textContent).toBe(raw);
    expect(rendered.querySelectorAll('.configuration-entry')).not.toHaveLength(0);
    expect(/** @type {HTMLDetailsElement | null} */ (rendered.querySelector('details.configuration-entries'))?.open).toBe(false);
    expect(/** @type {HTMLDetailsElement | null} */ (rendered.querySelector('details.configuration-entry'))?.open).toBe(true);
  });

  it('uses array values as entry titles while retaining index-based explanations', () => {
    const rendered = renderConfigurationView(context({
      document: {
        'control-plane': {
          scope: {
            'allowed-owners': ['githubnext', 'octodemo', { mode: 'review' }]
          }
        }
      },
      raw: '',
      diagnostics: []
    }));
    if (!rendered) throw new Error('configuration view did not render');

    const titles = [...rendered.querySelectorAll('.configuration-entry-heading > code')]
      .map((element) => element.textContent);
    expect(titles).toEqual([
      '.github/workflows/cao.json',
      'control-plane',
      'scope',
      'allowed-owners',
      'githubnext',
      'octodemo',
      '2',
      'mode'
    ]);
    expect(rendered.textContent).toContain('An owner included in the discovery boundary.');
  });

  it('copies the raw policy and reports invalid structured content', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const rendered = renderConfigurationView(context({
      document: null,
      raw: '{bad json',
      diagnostics: [{
        severity: 'error',
        title: 'Policy validation failed',
        path: '.github/workflows/cao.json',
        detail: 'Unexpected token'
      }]
    }));
    if (!rendered) throw new Error('configuration view did not render');

    expect(rendered.textContent).toContain('The policy cannot be explained until it contains valid JSON.');
    const copyButton = rendered.querySelector('.configuration-copy-button');
    if (!(copyButton instanceof HTMLButtonElement)) throw new Error('copy button did not render');
    copyButton.click();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith('{bad json');
    expect(rendered.querySelector('.configuration-copy-status')?.textContent).toBe('Copied.');
  });
});
