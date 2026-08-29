// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderDashboard } from '../../src/presenter.js';

describe('presenter built-in pages', () => {
  it('DLS-PAGE-003 DLS-PAGE-014 renders built-in organizations page with organization inventory, repository count, workflow count, run count, available usage measures, provenance, and independent data state deterministically', () => {
    /** @type {import('../../src/presenter.js').PresentationInput['document']} */
    const document = {
      languageVersion: '0.1.0',
      dashboard: {
        id: 'organizations-dashboard',
        title: 'Organizations Dashboard',
        pages: [
          {
            id: 'organizations',
            kind: /** @type {'built-in'} */ ('built-in'),
            page: 'organizations',
            title: 'Organizations',
            definition: {
              'data-state': {
                availability: true,
                completeness: true,
                freshness: true
              },
              views: [
                { id: 'organizations-source', data: { source: 'organizations' } },
                { id: 'repositories-source', data: { source: 'repositories' } },
                { id: 'workflows-source', data: { source: 'workflows' } },
                { id: 'runs-source', data: { source: 'runs' } },
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
        organizations: {
          source: 'organizations',
          rows: [
            { organization: 'github', 'organization-name': 'GitHub', 'observed-at': '2026-08-29T10:00:00Z' },
            { organization: 'octo-org', 'organization-name': 'Octo Org', 'observed-at': '2026-08-29T10:00:00Z' }
          ],
          metadata: {
            'source-id': 'organizations-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T19:00:00Z',
            'retrieved-at': '2026-08-29T19:01:00Z',
            completeness: 'partial',
            freshness: 'stale',
            availability: 'available'
          }
        },
        repositories: {
          source: 'repositories',
          rows: [
            { organization: 'github', repository: 'central-agentic-ops', 'repository-name': 'Central Agentic Ops', 'rollout-mode': 'live', 'observed-at': '2026-08-29T10:00:00Z' },
            { organization: 'github', repository: 'mona-tools', 'repository-name': 'Mona Tools', 'rollout-mode': 'review', 'observed-at': '2026-08-29T10:00:00Z' },
            { organization: 'octo-org', repository: 'octo-repo', 'repository-name': 'Octo Repo', 'rollout-mode': 'live', 'observed-at': '2026-08-29T10:00:00Z' }
          ],
          metadata: {
            'source-id': 'repositories-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T19:00:00Z',
            'retrieved-at': '2026-08-29T19:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        },
        workflows: {
          source: 'workflows',
          rows: [
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', 'workflow-name': 'Daily', 'workflow-active': 'true', 'rollout-mode': 'live', 'observed-at': '2026-08-29T10:00:00Z' },
            { organization: 'github', repository: 'mona-tools', workflow: '.github/workflows/review.yml', 'workflow-name': 'Review', 'workflow-active': 'false', 'rollout-mode': 'review', 'observed-at': '2026-08-29T10:00:00Z' },
            { organization: 'octo-org', repository: 'octo-repo', workflow: '.github/workflows/nightly.yml', 'workflow-name': 'Nightly', 'workflow-active': 'true', 'rollout-mode': 'live', 'observed-at': '2026-08-29T10:00:00Z' }
          ],
          metadata: {
            'source-id': 'workflows-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T19:00:00Z',
            'retrieved-at': '2026-08-29T19:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        },
        runs: {
          source: 'runs',
          rows: [
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1001', 'started-at': '2026-08-29T09:00:00Z', 'run-status': 'completed', 'run-conclusion': 'success', 'rollout-mode': 'live', engine: 'gpt', 'requested-model': 'gpt-4o', 'resolved-model': 'gpt-4.1' },
            { organization: 'github', repository: 'mona-tools', workflow: '.github/workflows/review.yml', run: '1002', 'started-at': '2026-08-29T09:30:00Z', 'run-status': 'completed', 'run-conclusion': 'failure', 'rollout-mode': 'review', engine: 'gpt', 'requested-model': 'gpt-4o-mini', 'resolved-model': 'gpt-4o-mini' },
            { organization: 'octo-org', repository: 'octo-repo', workflow: '.github/workflows/nightly.yml', run: '2001', 'started-at': '2026-08-29T08:00:00Z', 'run-status': 'in-progress', 'run-conclusion': 'unknown', 'rollout-mode': 'live', engine: 'claude', 'requested-model': 'claude-3.5', 'resolved-model': 'claude-3.5' }
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
        usage: {
          source: 'usage',
          rows: [
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1001', invocation: 'u1', engine: 'gpt', 'requested-model': 'gpt-4o', 'resolved-model': 'gpt-4.1', 'rollout-mode': 'live', 'input-tokens': 100, 'output-tokens': 50, 'cache-read-tokens': 20, 'cache-write-tokens': 10, 'reasoning-tokens': 5, aic: 3.5, 'observed-at': '2026-08-29T09:05:00Z' },
            { organization: 'github', repository: 'mona-tools', workflow: '.github/workflows/review.yml', run: '1002', invocation: 'u2', engine: 'gpt', 'requested-model': 'gpt-4o-mini', 'resolved-model': 'gpt-4o-mini', 'rollout-mode': 'review', 'input-tokens': 200, 'output-tokens': 80, 'cache-read-tokens': 40, 'cache-write-tokens': 15, 'reasoning-tokens': 7, aic: 4.5, 'observed-at': '2026-08-29T09:35:00Z' },
            { organization: 'octo-org', repository: 'octo-repo', workflow: '.github/workflows/nightly.yml', run: '2001', invocation: 'u3', engine: 'claude', 'requested-model': 'claude-3.5', 'resolved-model': 'claude-3.5', 'rollout-mode': 'live', 'input-tokens': 150, 'output-tokens': 60, 'cache-read-tokens': 30, 'cache-write-tokens': 12, 'reasoning-tokens': 9, aic: 2.25, 'observed-at': '2026-08-29T08:05:00Z' }
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

    expect(rendered.querySelector('[data-page-name="organizations"]')?.textContent).toContain('Organization Inventory');
    expect(rendered.querySelector('[data-state-axis="availability"]')?.textContent).toBe('available');
    expect(rendered.querySelector('[data-state-axis="completeness"]')?.textContent).toBe('partial');
    expect(rendered.querySelector('[data-state-axis="freshness"]')?.textContent).toBe('stale');
    expect(rendered.querySelectorAll('.organizations-table tbody tr')).toHaveLength(2);

    const githubRow = rendered.querySelector('[data-organization-id="github"]');
    expect(githubRow?.textContent).toContain('github');
    expect(githubRow?.textContent).toContain('GitHub');
    expect(githubRow?.textContent).toContain('2');
    expect(githubRow?.textContent).toContain('8');

    const octoRow = rendered.querySelector('[data-organization-id="octo-org"]');
    expect(octoRow?.textContent).toContain('octo-org');
    expect(octoRow?.textContent).toContain('Octo Org');
    expect(octoRow?.textContent).toContain('1');
    expect(octoRow?.textContent).toContain('2.25');

    expect(rendered.querySelector('.provenance-list')?.textContent).toContain('organizations: organizations-fixture (fixture) — as of 2026-08-29T19:00:00Z');
    expect(rendered.querySelector('.provenance-list')?.textContent).toContain('usage: usage-fixture (fixture) — as of 2026-08-29T19:00:00Z');
  });
});
