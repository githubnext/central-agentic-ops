import { describe, expect, it } from 'vitest';
import { deriveDataHealthSources } from '../../src/data-health.js';

const metadata = /** @type {import('../../src/presenter.js').SourceMetadata} */ ({
  'source-id': 'fixture',
  'source-kind': 'fixture',
  'as-of': '2026-09-03T12:00:00Z',
  'retrieved-at': '2026-09-03T12:01:00Z',
  completeness: 'complete',
  freshness: 'fresh',
  availability: 'available'
});

describe('data health sources', () => {
  it('reports retained shape and source state without counting blank fields as populated', () => {
    const sources = deriveDataHealthSources({
      runs: {
        source: 'runs',
        rows: [{ run: '1', workflow: '.github/workflows/ci.yml', note: '' }],
        metadata
      },
      usage: {
        source: 'usage',
        rows: [],
        metadata: { ...metadata, availability: 'unavailable', completeness: 'unknown' }
      }
    });

    expect(sources['data-health-sources'].rows).toEqual([
      expect.objectContaining({
        source: 'runs',
        rows: 1,
        fields: 27,
        'populated-fields': 2,
        'empty-fields': 25,
        'field-coverage': '7%',
        'cell-coverage': '7%',
        status: 'healthy'
      }),
      expect.objectContaining({
        source: 'usage',
        rows: 0,
        fields: 22,
        'field-coverage': '0%',
        'cell-coverage': '—',
        status: 'unavailable'
      })
    ]);
    expect(sources['data-health-summary'].rows).toEqual(expect.arrayContaining([
      { label: 'Logical sources', value: '2' },
      { label: 'Healthy sources', value: '1' },
      { label: 'Sources needing attention', value: '1' },
      { label: 'Retained rows', value: '1' }
    ]));
  });

  it('does not report empty or unknown-state sources as healthy', () => {
    const sources = deriveDataHealthSources({
      empty: {
        source: 'empty',
        rows: [],
        metadata: { ...metadata, availability: 'empty' }
      },
      unknown: {
        source: 'unknown',
        rows: [{ value: 1 }],
        metadata: { ...metadata, completeness: 'unknown' }
      }
    });

    expect(sources['data-health-sources'].rows).toEqual([
      expect.objectContaining({ source: 'empty', status: 'empty' }),
      expect.objectContaining({ source: 'unknown', status: 'degraded' })
    ]);
    expect(sources['data-health-summary'].rows).toContainEqual({ label: 'Sources needing attention', value: '2' });
  });
});
