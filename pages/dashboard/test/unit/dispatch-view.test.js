// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderDashboard } from '../../src/presenter.js';

const dashboard = JSON.parse(readFileSync(`${process.cwd()}/dashboard.json`, 'utf8'));
const dispatchPage = dashboard.dashboard.pages.find((/** @type {{ id: string }} */ page) => page.id === 'dispatches');
const metadata = {
  'source-id': 'fixture',
  'source-kind': 'fixture',
  'as-of': '2026-08-30T08:00:00Z',
  'retrieved-at': '2026-08-30T08:01:00Z',
  completeness: /** @type {'complete'} */ ('complete'),
  freshness: /** @type {'fresh'} */ ('fresh'),
  availability: /** @type {'available'} */ ('available')
};

describe('declarative dispatch view', () => {
  it('renders JSON-specified dispatch columns with reusable table controls', () => {
    const rendered = renderDashboard({
      document: {
        languageVersion: '0.1.0',
        dashboard: {
          id: 'dispatch-test',
          title: 'Dispatch test',
          pages: [dispatchPage]
        }
      },
      sources: {
        workflows: {
          source: 'workflows',
          metadata,
          rows: [
            { organization: 'githubnext', repository: 'control', workflow: 'worker.yml', 'workflow-name': 'Dependency updater', 'workflow-role': 'worker', package: 'dependabot', 'package-name': 'Dependabot' }
          ]
        },
        runs: {
          source: 'runs',
          metadata,
          rows: [
            { organization: 'githubnext', repository: 'control', workflow: 'worker.yml', run: '3', event: 'workflow_dispatch', 'run-title': 'Update dependencies', 'started-at': '2026-08-30T07:00:00Z', 'run-conclusion': 'action-required', 'run-link': { relation: 'run', href: 'https://github.com/githubnext/control/actions/runs/3', label: 'Run 3' } }
          ]
        }
      }
    });

    expect(dispatchPage.views[0]).toMatchObject({
      mark: 'table',
      data: { source: 'dispatches' }
    });
    expect(dispatchPage.views[0]).not.toHaveProperty('element');
    expect([...rendered.querySelectorAll('thead tr:first-child th')].map((cell) => cell.textContent)).toEqual([
      'Started',
      'Type',
      'Package',
      'Workflow',
      'Run title',
      'Runtime repository',
      'Status'
    ]);
    expect(rendered.textContent).toContain('Package worker');
    expect(rendered.textContent).toContain('Update dependencies');
    expect(rendered.querySelector('.status-attention')).not.toBeNull();
    expect(rendered.querySelector('input[type="search"]')).not.toBeNull();
    expect(rendered.querySelector('a[href="https://github.com/githubnext/control/actions/runs/3"]')).not.toBeNull();
  });
});
