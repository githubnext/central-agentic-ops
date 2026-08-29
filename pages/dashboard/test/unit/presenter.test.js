// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderDashboard } from '../../src/presenter.js';

describe('presenter built-in pages', () => {
  it('DLS-PAGE-011 DLS-PAGE-014 renders built-in engines-models page with separate engine, requested model, resolved model, run counts, run conclusions, outcomes, raw tokens, AIC, provenance, and independent data state deterministically', () => {
    /** @type {import('../../src/presenter.js').PresentationInput['document']} */
    const document = {
      languageVersion: '0.1.0',
      dashboard: {
        id: 'engines-models-dashboard',
        title: 'Engines Models Dashboard',
        pages: [
          {
            id: 'engines-models',
            kind: /** @type {'built-in'} */ ('built-in'),
            page: 'engines-models',
            title: 'Engines Models',
            definition: {
              'data-state': {
                availability: true,
                completeness: true,
                freshness: true
              },
              views: [
                { id: 'runs-source', data: { source: 'runs' } },
                { id: 'outcomes-source', data: { source: 'outcomes' } },
                { id: 'usage-source', data: { source: 'usage' } }
              ]
            }
          }
        ]
      }
    };

    const rendered = renderDashboard({
      document,
      sources: {
        runs: {
          source: 'runs',
          rows: [
            {
              run: '1001',
              engine: 'openai',
              'requested-model': 'gpt-4.1',
              'resolved-model': 'gpt-4.1-mini',
              'run-conclusion': 'success'
            },
            {
              run: '1002',
              engine: 'openai',
              'requested-model': 'gpt-4.1',
              'resolved-model': 'gpt-4.1-mini',
              'run-conclusion': 'failure'
            },
            {
              run: '1003',
              engine: 'anthropic',
              'requested-model': 'claude-3.5-sonnet',
              'resolved-model': 'claude-3.5-sonnet',
              'run-conclusion': 'success'
            }
          ],
          metadata: {
            'source-id': 'runs-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T19:00:00Z',
            'retrieved-at': '2026-08-29T19:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        },
        outcomes: {
          source: 'outcomes',
          rows: [
            { run: '1001', 'outcome-state': 'accepted' },
            { run: '1001', 'outcome-state': 'pending' },
            { run: '1003', 'outcome-state': 'rejected' }
          ],
          metadata: {
            'source-id': 'outcomes-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T19:00:00Z',
            'retrieved-at': '2026-08-29T19:01:00Z',
            completeness: 'partial',
            freshness: 'stale',
            availability: 'available'
          }
        },
        usage: {
          source: 'usage',
          rows: [
            {
              invocation: 'invoke-1',
              run: '1001',
              engine: 'openai',
              'requested-model': 'gpt-4.1',
              'resolved-model': 'gpt-4.1-mini',
              'input-tokens': 10,
              'output-tokens': 5,
              'cache-read-tokens': 2,
              'cache-write-tokens': 1,
              'reasoning-tokens': 3,
              aic: 4
            },
            {
              invocation: 'invoke-2',
              run: '1002',
              engine: 'openai',
              'requested-model': 'gpt-4.1',
              'resolved-model': 'gpt-4.1-mini',
              'input-tokens': 7,
              'output-tokens': 11,
              'cache-read-tokens': 0,
              'cache-write-tokens': 4,
              'reasoning-tokens': 6,
              aic: 9
            },
            {
              invocation: 'invoke-3',
              run: '1003',
              engine: 'anthropic',
              'requested-model': 'claude-3.5-sonnet',
              'resolved-model': 'claude-3.5-sonnet',
              'input-tokens': 3,
              'output-tokens': 4,
              'cache-read-tokens': 1,
              'cache-write-tokens': 0,
              'reasoning-tokens': 2,
              aic: 5
            }
          ],
          metadata: {
            'source-id': 'usage-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T19:00:00Z',
            'retrieved-at': '2026-08-29T19:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        }
      }
    });

    expect(rendered.querySelector('[data-page-name="engines-models"]')?.textContent).toContain('Engine and Model Inventory');
    expect(rendered.querySelector('[data-state-axis="availability"]')?.textContent).toBe('available');
    expect(rendered.querySelector('[data-state-axis="completeness"]')?.textContent).toBe('partial');
    expect(rendered.querySelector('[data-state-axis="freshness"]')?.textContent).toBe('stale');
    expect(rendered.querySelectorAll('.engines-models-table tbody tr')).toHaveLength(2);

    const firstRowText = rendered.querySelector('.engines-models-table tbody tr')?.textContent ?? '';
    expect(firstRowText).toContain('anthropic');
    expect(firstRowText).toContain('claude-3.5-sonnet');
    expect(firstRowText).toContain('1');
    expect(firstRowText).toContain('success: 1');
    expect(firstRowText).toContain('3');
    expect(firstRowText).toContain('4');
    expect(firstRowText).toContain('5');

    const secondRowText = rendered.querySelectorAll('.engines-models-table tbody tr')[1]?.textContent ?? '';
    expect(secondRowText).toContain('openai');
    expect(secondRowText).toContain('gpt-4.1');
    expect(secondRowText).toContain('gpt-4.1-mini');
    expect(secondRowText).toContain('2');
    expect(secondRowText).toContain('success: 1, failure: 1');
    expect(secondRowText).toContain('2');
    expect(secondRowText).toContain('17');
    expect(secondRowText).toContain('16');
    expect(secondRowText).toContain('2');
    expect(secondRowText).toContain('5');
    expect(secondRowText).toContain('9');
    expect(secondRowText).toContain('13');
    expect(rendered.querySelector('.provenance-list')?.textContent).toContain('runs: runs-fixture (fixture) — as of 2026-08-29T19:00:00Z');
    expect(rendered.querySelector('.provenance-list')?.textContent).toContain('outcomes: outcomes-fixture (fixture) — as of 2026-08-29T19:00:00Z');
    expect(rendered.querySelector('.provenance-list')?.textContent).toContain('usage: usage-fixture (fixture) — as of 2026-08-29T19:00:00Z');
  });
});
