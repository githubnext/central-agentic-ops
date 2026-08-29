// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderDashboard, enableDashboardKeyboardNavigation } from '../../src/presenter.js';

describe('presenter built-in pages', () => {
  it('DLS-PAGE-009 DLS-PAGE-014 renders built-in evals page with distinguishable definitions and observations, observed subject, YES/NO/UNKNOWN result, evaluation model when available, time, provenance, and independent data state deterministically', () => {
    /** @type {import('../../src/presenter.js').PresentationInput['document']} */
    const document = {
      languageVersion: '0.1.0',
      dashboard: {
        id: 'evals-dashboard',
        title: 'Evals Dashboard',
        pages: [
          {
            id: 'evals',
            kind: /** @type {'built-in'} */ ('built-in'),
            page: 'evals',
            title: 'Evals',
            definition: {
              'data-state': {
                availability: true,
                completeness: true,
                freshness: true
              },
              views: [
                { id: 'evals-source', data: { source: 'evals' } },
                { id: 'eval-observations-source', data: { source: 'eval-observations' } }
              ]
            }
          }
        ]
      }
    };

    const rendered = renderDashboard({
      document,
      sources: {
        evals: {
          source: 'evals',
          rows: [
            { eval: 'release-risk', 'eval-name': 'Release Risk', 'eval-question': 'Is the release risky?', 'requested-model': 'gpt-4o', 'observed-at': '2026-08-29T09:00:00Z' },
            { eval: 'doc-quality', 'eval-name': 'Documentation Quality', 'eval-question': 'Is the documentation complete?', 'requested-model': 'claude-3.5', 'observed-at': '2026-08-29T09:05:00Z' }
          ],
          metadata: {
            'source-id': 'evals-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T20:00:00Z',
            'retrieved-at': '2026-08-29T20:01:00Z',
            completeness: 'partial',
            freshness: 'stale',
            availability: 'available'
          }
        },
        'eval-observations': {
          source: 'eval-observations',
          rows: [
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1001', eval: 'release-risk', 'eval-result': 'YES', 'requested-model': 'gpt-4o', 'resolved-model': 'gpt-4.1', 'rollout-mode': 'live', 'observed-at': '2026-08-29T10:00:00Z' },
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1002', eval: 'release-risk', 'eval-result': 'UNKNOWN', 'requested-model': 'gpt-4o', 'resolved-model': '', 'rollout-mode': 'live', 'observed-at': '2026-08-29T10:10:00Z' },
            { organization: 'octo-org', repository: 'octo-repo', workflow: '.github/workflows/nightly.yml', run: '2001', eval: 'doc-quality', 'eval-result': 'NO', 'requested-model': 'claude-3.5', 'resolved-model': 'claude-3.7', 'rollout-mode': 'review', 'observed-at': '2026-08-29T10:20:00Z' }
          ],
          metadata: {
            'source-id': 'eval-observations-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T20:00:00Z',
            'retrieved-at': '2026-08-29T20:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        }
      }
    });

    const evalsPage = rendered.querySelector('[data-page-name="evals"]');
    expect(evalsPage?.textContent).toContain('Eval Definitions');
    expect(evalsPage?.textContent).toContain('Eval Observations');
    expect(rendered.querySelector('[data-state-axis="availability"]')?.textContent).toBe('available');
    expect(rendered.querySelector('[data-state-axis="completeness"]')?.textContent).toBe('partial');
    expect(rendered.querySelector('[data-state-axis="freshness"]')?.textContent).toBe('stale');
    expect(rendered.querySelectorAll('.evals-definitions-table tbody tr')).toHaveLength(2);
    expect(rendered.querySelectorAll('.eval-observations-table tbody tr')).toHaveLength(3);

    const releaseRiskDefinition = rendered.querySelector('[data-eval-id="release-risk"]');
    expect(releaseRiskDefinition?.textContent).toContain('Release Risk');
    expect(releaseRiskDefinition?.textContent).toContain('Is the release risky?');
    expect(releaseRiskDefinition?.textContent).toContain('gpt-4o');
    expect(releaseRiskDefinition?.textContent).toContain('2');
    expect(releaseRiskDefinition?.textContent).toContain('github / central-agentic-ops / .github/workflows/daily.yml / run 1001');
    expect(releaseRiskDefinition?.textContent).toContain('github / central-agentic-ops / .github/workflows/daily.yml / run 1002');
    expect(releaseRiskDefinition?.textContent).toContain('YES: 1, UNKNOWN: 1');
    expect(releaseRiskDefinition?.textContent).toContain('gpt-4o → gpt-4.1');
    expect(releaseRiskDefinition?.textContent).toContain('2026-08-29T10:10:00Z');

    const docQualityDefinition = rendered.querySelector('[data-eval-id="doc-quality"]');
    expect(docQualityDefinition?.textContent).toContain('Documentation Quality');
    expect(docQualityDefinition?.textContent).toContain('NO: 1');
    expect(docQualityDefinition?.textContent).toContain('claude-3.5 → claude-3.7');

    const releaseRiskYesRow = rendered.querySelector('[data-eval-observation-key="release-risk-1001-0"]');
    expect(releaseRiskYesRow?.textContent).toContain('release-risk');
    expect(releaseRiskYesRow?.textContent).toContain('github / central-agentic-ops / .github/workflows/daily.yml / run 1001');
    expect(releaseRiskYesRow?.textContent).toContain('YES');
    expect(releaseRiskYesRow?.textContent).toContain('gpt-4o');
    expect(releaseRiskYesRow?.textContent).toContain('gpt-4.1');

    const sidebarCurrentPage = rendered.querySelector('.primary-nav a[aria-current="page"]');
    expect(sidebarCurrentPage?.getAttribute('aria-current')).toBe('page');
    expect(sidebarCurrentPage?.textContent).toContain('Evals');

    const skipLink = rendered.querySelector('.skip-link');
    expect(skipLink?.getAttribute('href')).toBe('#main-content');

    const releaseRiskUnknownRow = rendered.querySelector('[data-eval-observation-key="release-risk-1002-1"]');
    expect(releaseRiskUnknownRow?.textContent).toContain('UNKNOWN');
    expect(releaseRiskUnknownRow?.textContent).toContain('unknown');

    const docQualityNoRow = rendered.querySelector('[data-eval-observation-key="doc-quality-2001-2"]');
    expect(docQualityNoRow?.textContent).toContain('NO');
    expect(docQualityNoRow?.textContent).toContain('claude-3.7');

    expect(rendered.querySelector('.provenance-list')?.textContent).toContain('evals: evals-fixture (fixture) — as of 2026-08-29T20:00:00Z');
    expect(rendered.querySelector('.provenance-list')?.textContent).toContain('eval-observations: eval-observations-fixture (fixture) — as of 2026-08-29T20:00:00Z');
  });

  it('DLS-SAFE-007 DLS-SAFE-010 DLS-SAFE-003 renders non-empty accessible names and inert text labels while preserving safe external link attributes', () => {
    /** @type {import('../../src/presenter.js').PresentationInput['document']} */
    const document = {
      languageVersion: '0.1.0',
      dashboard: {
        id: 'findings-dashboard',
        title: 'Security Dashboard',
        pages: [
          {
            id: 'findings',
            kind: /** @type {'built-in'} */ ('built-in'),
            page: 'findings',
            title: 'Findings',
            definition: {
              'data-state': {
                availability: true,
                completeness: true,
                freshness: true
              },
              views: [
                { id: 'findings-source', data: { source: 'findings' } }
              ]
            }
          }
        ]
      }
    };

    const rendered = renderDashboard({
      document,
      sources: {
        findings: {
          source: 'findings',
          rows: [
            {
              finding: 'unsafe-html',
              'finding-summary': '<img src=x onerror=alert(1)>',
              'finding-severity': 'critical',
              'finding-status': 'open',
              organization: 'github',
              repository: 'central-agentic-ops',
              workflow: '.github/workflows/daily.yml',
              'observed-at': '2026-08-29T12:00:00Z',
              'issue-link': {
                relation: 'issue',
                href: 'https://example.com/issues/1',
                label: 'Issue 1 label'
              }
            }
          ],
          metadata: {
            'source-id': 'findings-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T20:00:00Z',
            'retrieved-at': '2026-08-29T20:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        }
      }
    });

    expect(rendered.querySelector('[data-page-name="findings"] h2')?.textContent).toBe('Findings');
    expect(rendered.querySelector('.brand-title')?.textContent).toBe('Security Dashboard');
    expect(rendered.querySelector('.findings-table thead')?.textContent).toContain('Issue Link');

    const summaryCell = rendered.querySelector('[data-finding-id="unsafe-html"] td');
    expect(summaryCell?.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(summaryCell?.querySelector('img')).toBeNull();

    const issueLink = rendered.querySelector('[data-finding-id="unsafe-html"] a');
    expect(issueLink?.getAttribute('href')).toBe('https://example.com/issues/1');
    expect(issueLink?.getAttribute('aria-label')).toBe('Issue 1 label');
    expect(issueLink?.getAttribute('target')).toBe('_blank');
    expect(issueLink?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(issueLink?.textContent).toBe('Issue 1 label');
  });

  it('DLS-SAFE-007 DLS-SAFE-008 enables keyboard navigation across labeled page sections without relying on color alone', () => {
    /** @type {import('../../src/presenter.js').PresentationInput['document']} */
    const dashboardDocument = {
      languageVersion: '0.1.0',
      dashboard: {
        id: 'runs-dashboard',
        title: 'Runs Dashboard',
        pages: [
          {
            id: 'runs',
            kind: /** @type {'built-in'} */ ('built-in'),
            page: 'runs',
            title: 'Runs',
            definition: {
              'data-state': {
                availability: true,
                completeness: true,
                freshness: true
              },
              views: [
                { id: 'runs-source', data: { source: 'runs' } },
                { id: 'outcomes-source', data: { source: 'outcomes' } }
              ]
            }
          }
        ]
      }
    };

    const rendered = renderDashboard({
      document: dashboardDocument,
      sources: {
        runs: {
          source: 'runs',
          rows: [
            {
              organization: 'github',
              repository: 'central-agentic-ops',
              workflow: '.github/workflows/daily.yml',
              run: '1001',
              'run-status': 'completed',
              'run-conclusion': 'success',
              'rollout-mode': 'live',
              engine: 'actions',
              'requested-model': 'gpt-4o',
              'resolved-model': 'gpt-4.1',
              'started-at': '2026-08-29T10:00:00Z',
              'run-link': {
                relation: 'run',
                href: 'https://example.com/runs/1001',
                label: 'Run 1001'
              }
            }
          ],
          metadata: {
            'source-id': 'runs-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T20:00:00Z',
            'retrieved-at': '2026-08-29T20:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        },
        outcomes: {
          source: 'outcomes',
          rows: [
            {
              run: '1001',
              'outcome-state': 'accepted'
            }
          ],
          metadata: {
            'source-id': 'outcomes-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T20:00:00Z',
            'retrieved-at': '2026-08-29T20:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        }
      }
    });

    rendered.ownerDocument.body.append(rendered);
    enableDashboardKeyboardNavigation(rendered);

    const sections = rendered.querySelectorAll('.runs-page .page-section');
    expect(sections).toHaveLength(4);
    expect(sections[0]?.getAttribute('aria-labelledby')).toContain('runs-run-status-counts-heading');
    expect(sections[1]?.getAttribute('aria-labelledby')).toContain('runs-run-conclusion-counts-heading');

    const firstSection = /** @type {HTMLElement} */ (sections[0]);
    const secondSection = /** @type {HTMLElement} */ (sections[1]);
    const thirdSection = /** @type {HTMLElement} */ (sections[2]);

    firstSection.focus();
    firstSection.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(rendered.ownerDocument.activeElement).toBe(secondSection);

    secondSection.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(rendered.ownerDocument.activeElement).toBe(thirdSection);

    thirdSection.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(rendered.ownerDocument.activeElement).toBe(secondSection);
  });
});
