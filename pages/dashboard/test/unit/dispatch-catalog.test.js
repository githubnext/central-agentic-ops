// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderDispatchCatalog } from '../../src/components/dispatch-catalog.js';

const metadata = {
  'source-id': 'fixture',
  'source-kind': 'fixture',
  'as-of': '2026-08-30T08:00:00Z',
  'retrieved-at': '2026-08-30T08:01:00Z',
  completeness: /** @type {'complete'} */ ('complete'),
  freshness: /** @type {'fresh'} */ ('fresh'),
  availability: /** @type {'available'} */ ('available')
};

/** @param {Array<Record<string, unknown>>} runs */
function context(runs) {
  return {
    pageId: 'dispatches',
    title: 'Package-worker dispatches',
    sourceNames: ['runs', 'workflows'],
    contextDetails: [],
    headingTag: /** @type {'h3'} */ ('h3'),
    sources: {
      workflows: {
        source: 'workflows',
        metadata,
        rows: [
          { organization: 'githubnext', repository: 'control', package: 'dependabot', 'package-name': 'Dependabot', workflow: '.github/workflows/worker.yml', 'workflow-name': 'Dependency updater', 'workflow-role': 'worker' },
          { organization: 'githubnext', repository: 'control', package: 'dependabot', workflow: '.github/workflows/orchestrator.yml', 'workflow-role': 'orchestrator' }
        ]
      },
      runs: { source: 'runs', metadata, rows: runs }
    }
  };
}

describe('renderDispatchCatalog', () => {
  it('retains only authoritative package-worker workflow_dispatch runs', () => {
    const rendered = renderDispatchCatalog(context([
      { organization: 'githubnext', repository: 'control', workflow: '.github/workflows/worker.yml', run: '102', event: 'workflow_dispatch', 'run-title': 'Update dependencies', 'started-at': '2026-08-30T07:00:00Z', 'run-conclusion': 'action-required' },
      { organization: 'githubnext', repository: 'control', workflow: '.github/workflows/worker.yml', run: '101', event: 'schedule', 'started-at': '2026-08-30T06:00:00Z', 'run-conclusion': 'success' },
      { organization: 'githubnext', repository: 'control', workflow: '.github/workflows/orchestrator.yml', run: '100', event: 'workflow_dispatch', 'started-at': '2026-08-30T05:00:00Z', 'run-conclusion': 'success' }
    ]));

    expect(rendered.querySelectorAll('[data-dispatch-row]')).toHaveLength(1);
    expect(rendered.textContent).toContain('Dependency updater');
    expect(rendered.textContent).toContain('Update dependencies');
    expect(rendered.querySelector('.status-attention')).not.toBeNull();
    expect(rendered.querySelector('.dispatch-result')?.textContent).toBe('1 of 1 dispatches');
  });

  it('keeps filters and the reference empty state visible with no dispatches', () => {
    const rendered = renderDispatchCatalog(context([]));

    expect(rendered.querySelector('input[type="search"]')).not.toBeNull();
    expect(rendered.querySelector('select')?.textContent).toContain('All packages');
    expect(rendered.querySelector('tbody td')?.textContent).toBe('No package-worker dispatches were observed in the current run window.');
    expect(rendered.querySelector('.dispatch-result')?.textContent).toBe('0 of 0 dispatches');
  });

  it('filters dispatches by search text and package', () => {
    const rendered = renderDispatchCatalog({
      ...context([]),
      sources: {
        ...context([]).sources,
        workflows: {
          source: 'workflows',
          metadata,
          rows: [
            { repository: 'control', package: 'alpha', 'package-name': 'Alpha', workflow: 'alpha.yml', 'workflow-name': 'Alpha worker', 'workflow-role': 'worker' },
            { repository: 'control', package: 'beta', 'package-name': 'Beta', workflow: 'beta.yml', 'workflow-name': 'Beta worker', 'workflow-role': 'worker' }
          ]
        },
        runs: {
          source: 'runs',
          metadata,
          rows: [
            { repository: 'control', workflow: 'alpha.yml', run: '1', event: 'workflow_dispatch', 'started-at': '2026-08-30T07:00:00Z', 'run-conclusion': 'success' },
            { repository: 'control', workflow: 'beta.yml', run: '2', event: 'workflow_dispatch', 'started-at': '2026-08-30T06:00:00Z', 'run-conclusion': 'failure' }
          ]
        }
      }
    });
    const search = /** @type {HTMLInputElement} */ (rendered.querySelector('input'));
    const select = /** @type {HTMLSelectElement} */ (rendered.querySelector('select'));
    const rows = [...rendered.querySelectorAll('[data-dispatch-row]')];

    search.value = 'failure';
    search.dispatchEvent(new Event('input'));
    expect(rows.map((row) => row.hasAttribute('hidden'))).toEqual([true, false]);

    search.value = '';
    select.value = 'Alpha';
    select.dispatchEvent(new Event('input'));
    expect(rows.map((row) => row.hasAttribute('hidden'))).toEqual([false, true]);
  });
});
