import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

function buildPresenterModuleUrl() {
  const dashboardSource = readFileSync(new URL('../../dashboard.json', import.meta.url), 'utf8');
  const dashboardModuleUrl = `data:application/json;charset=utf-8,${encodeURIComponent(dashboardSource)}`;
  const domSource = readFileSync(new URL('../../src/dom.js', import.meta.url), 'utf8');
  const domModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(domSource)}`;

  const stylesSource = readFileSync(new URL('../../src/styles.js', import.meta.url), 'utf8');
  const stylesModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(stylesSource)}`;

  const octiconsSprite = readFileSync(new URL('../../src/octicons.svg', import.meta.url), 'utf8');
  const octiconsSpriteUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(octiconsSprite)}`;
  const octiconsSource = readFileSync(new URL('../../src/octicons.js', import.meta.url), 'utf8')
    .replace("'./dom.js'", JSON.stringify(domModuleUrl))
    .replace("'./octicons.svg'", JSON.stringify(octiconsSpriteUrl));
  const octiconsModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(octiconsSource)}`;

  const badgeSource = readFileSync(new URL('../../src/components/badge.js', import.meta.url), 'utf8')
    .replace("'../dom.js'", JSON.stringify(domModuleUrl));
  const badgeModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(badgeSource)}`;

  const dataStateSource = readFileSync(new URL('../../src/components/data-state.js', import.meta.url), 'utf8')
    .replace("'../dom.js'", JSON.stringify(domModuleUrl))
    .replace("'./badge.js'", JSON.stringify(badgeModuleUrl));
  const dataStateModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(dataStateSource)}`;

  const histogramSource = readFileSync(new URL('../../src/components/histogram.js', import.meta.url), 'utf8')
    .replace("'../dom.js'", JSON.stringify(domModuleUrl));
  const histogramModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(histogramSource)}`;

  const summaryCopySource = readFileSync(new URL('../../src/components/summary-copy.js', import.meta.url), 'utf8')
    .replace("'../dom.js'", JSON.stringify(domModuleUrl));
  const summaryCopyModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(summaryCopySource)}`;

  const tableSummarySource = readFileSync(new URL('../../src/components/table-summary.js', import.meta.url), 'utf8')
    .replace("'../dom.js'", JSON.stringify(domModuleUrl))
    .replace("'./histogram.js'", JSON.stringify(histogramModuleUrl))
    .replace("'./summary-copy.js'", JSON.stringify(summaryCopyModuleUrl));
  const tableSummaryModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(tableSummarySource)}`;

  const tableRegionSource = readFileSync(new URL('../../src/components/table-region.js', import.meta.url), 'utf8')
    .replace("'../dom.js'", JSON.stringify(domModuleUrl))
    .replace("'./table-summary.js'", JSON.stringify(tableSummaryModuleUrl));
  const tableRegionModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(tableRegionSource)}`;

  const viewChromeSource = readFileSync(new URL('../../src/components/view-chrome.js', import.meta.url), 'utf8')
    .replace("'../dom.js'", JSON.stringify(domModuleUrl));
  const viewChromeModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(viewChromeSource)}`;

  const viewFormattersSource = readFileSync(new URL('../../src/view-formatters.js', import.meta.url), 'utf8');
  const viewFormattersModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(viewFormattersSource)}`;

  const cellDisplaySource = readFileSync(new URL('../../src/components/cell-display.js', import.meta.url), 'utf8')
    .replace("'../dom.js'", JSON.stringify(domModuleUrl))
    .replace("'./badge.js'", JSON.stringify(badgeModuleUrl))
    .replace("'../view-formatters.js'", JSON.stringify(viewFormattersModuleUrl));
  const cellDisplayModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(cellDisplaySource)}`;

  const runClassificationRuleSource = readFileSync(new URL('../../src/components/run-conclusion-classification.json', import.meta.url), 'utf8');
  const runClassificationRuleUrl = `data:application/json;charset=utf-8,${encodeURIComponent(runClassificationRuleSource)}`;

  const utilizationThresholdsSource = readFileSync(new URL('../../src/components/package-aic-utilization-thresholds.json', import.meta.url), 'utf8');
  const utilizationThresholdsUrl = `data:application/json;charset=utf-8,${encodeURIComponent(utilizationThresholdsSource)}`;

  const runClassificationSource = readFileSync(new URL('../../src/components/run-classification.js', import.meta.url), 'utf8')
    .replace("'./run-conclusion-classification.json'", JSON.stringify(runClassificationRuleUrl))
    .replace("'./package-aic-utilization-thresholds.json'", JSON.stringify(utilizationThresholdsUrl));
  const runClassificationModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(runClassificationSource)}`;

  const attentionRulesJsonSource = readFileSync(new URL('../../src/components/attention-rules.json', import.meta.url), 'utf8');
  const attentionRulesJsonUrl = `data:application/json;charset=utf-8,${encodeURIComponent(attentionRulesJsonSource)}`;

  const attentionRulesSource = readFileSync(new URL('../../src/components/attention-rules.js', import.meta.url), 'utf8')
    .replace("'./attention-rules.json'", JSON.stringify(attentionRulesJsonUrl));
  const attentionRulesModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(attentionRulesSource)}`;

  const packagesViewSource = readFileSync(new URL('../../src/components/packages-view.js', import.meta.url), 'utf8')
    .replace("'../dom.js'", JSON.stringify(domModuleUrl))
    .replace("'../view-formatters.js'", JSON.stringify(viewFormattersModuleUrl))
    .replace("'./run-classification.js'", JSON.stringify(runClassificationModuleUrl));
  const packagesViewModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(packagesViewSource)}`;

  const filterBarSource = readFileSync(new URL('../../src/components/filter-bar.js', import.meta.url), 'utf8')
    .replace("'../dom.js'", JSON.stringify(domModuleUrl))
    .replace("'../octicons.js'", JSON.stringify(octiconsModuleUrl));
  const filterBarModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(filterBarSource)}`;

  const linkContentSource = readFileSync(new URL('../../src/components/link-content.js', import.meta.url), 'utf8')
    .replace("'../dom.js'", JSON.stringify(domModuleUrl))
    .replace("'../octicons.js'", JSON.stringify(octiconsModuleUrl));
  const linkContentModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(linkContentSource)}`;

  const linkedTextSource = readFileSync(new URL('../../src/components/linked-text.js', import.meta.url), 'utf8')
    .replace("'../dom.js'", JSON.stringify(domModuleUrl));
  const linkedTextModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(linkedTextSource)}`;

  const countFormattersSource = readFileSync(new URL('../../src/components/count-formatters.js', import.meta.url), 'utf8');
  const countFormattersModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(countFormattersSource)}`;

  const workflowTopologySource = readFileSync(new URL('../../src/components/workflow-topology.js', import.meta.url), 'utf8')
    .replace("'../dom.js'", JSON.stringify(domModuleUrl))
    .replace("'../octicons.js'", JSON.stringify(octiconsModuleUrl))
    .replace("'./count-formatters.js'", JSON.stringify(countFormattersModuleUrl))
    .replace("'./link-content.js'", JSON.stringify(linkContentModuleUrl))
    .replace("'./linked-text.js'", JSON.stringify(linkedTextModuleUrl))
    .replace("'./view-chrome.js'", JSON.stringify(viewChromeModuleUrl));
  const workflowTopologyModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(workflowTopologySource)}`;

  const chartElementsSource = readFileSync(new URL('../../src/components/chart-elements.js', import.meta.url), 'utf8')
    .replace("'../dom.js'", JSON.stringify(domModuleUrl))
    .replace("'../view-formatters.js'", JSON.stringify(viewFormattersModuleUrl));
  const chartElementsModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(chartElementsSource)}`;

  const dispatchCatalogSource = readFileSync(new URL('../../src/components/dispatch-catalog.js', import.meta.url), 'utf8')
    .replace("'../dom.js'", JSON.stringify(domModuleUrl))
    .replace("'./badge.js'", JSON.stringify(badgeModuleUrl))
    .replace("'./link-content.js'", JSON.stringify(linkContentModuleUrl))
    .replace("'./linked-text.js'", JSON.stringify(linkedTextModuleUrl));
  const dispatchCatalogModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(dispatchCatalogSource)}`;

  const repositoryWorkflowsSource = readFileSync(new URL('../../src/components/repository-workflows.js', import.meta.url), 'utf8')
    .replace("'../dom.js'", JSON.stringify(domModuleUrl))
    .replace("'../octicons.js'", JSON.stringify(octiconsModuleUrl))
    .replace("'./badge.js'", JSON.stringify(badgeModuleUrl))
    .replace("'./count-formatters.js'", JSON.stringify(countFormattersModuleUrl))
    .replace("'./link-content.js'", JSON.stringify(linkContentModuleUrl))
    .replace("'./linked-text.js'", JSON.stringify(linkedTextModuleUrl));
  const repositoryWorkflowsModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(repositoryWorkflowsSource)}`;

  const uiPrimitivesSource = readFileSync(new URL('../../src/components/ui-primitives.js', import.meta.url), 'utf8')
    .replace("'../dom.js'", JSON.stringify(domModuleUrl));
  const uiPrimitivesModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(uiPrimitivesSource)}`;

  const executionElementsSource = readFileSync(new URL('../../src/components/execution-elements.js', import.meta.url), 'utf8')
    .replace("'../dom.js'", JSON.stringify(domModuleUrl))
    .replace("'../octicons.js'", JSON.stringify(octiconsModuleUrl))
    .replace("'./badge.js'", JSON.stringify(badgeModuleUrl))
    .replace("'./count-formatters.js'", JSON.stringify(countFormattersModuleUrl))
    .replace("'./link-content.js'", JSON.stringify(linkContentModuleUrl))
    .replace("'./ui-primitives.js'", JSON.stringify(uiPrimitivesModuleUrl));
  const executionElementsModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(executionElementsSource)}`;

  const uiElementsSource = readFileSync(new URL('../../src/components/ui-elements.js', import.meta.url), 'utf8')
    .replace("'../dom.js'", JSON.stringify(domModuleUrl))
    .replace("'../octicons.js'", JSON.stringify(octiconsModuleUrl))
    .replace("'../view-formatters.js'", JSON.stringify(viewFormattersModuleUrl))
    .replace("'./badge.js'", JSON.stringify(badgeModuleUrl))
    .replace("'./link-content.js'", JSON.stringify(linkContentModuleUrl))
    .replace("'./packages-view.js'", JSON.stringify(packagesViewModuleUrl))
    .replace("'./repository-workflows.js'", JSON.stringify(repositoryWorkflowsModuleUrl))
    .replace("'./execution-elements.js'", JSON.stringify(executionElementsModuleUrl))
    .replace("'./ui-primitives.js'", JSON.stringify(uiPrimitivesModuleUrl))
    .replace("'./workflow-topology.js'", JSON.stringify(workflowTopologyModuleUrl))
    .replace("'./dispatch-catalog.js'", JSON.stringify(dispatchCatalogModuleUrl));
  const uiElementsModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(uiElementsSource)}`;

  const dataViewSource = readFileSync(new URL('../../src/components/data-view.js', import.meta.url), 'utf8')
    .replace("'../dom.js'", JSON.stringify(domModuleUrl))
    .replace("'../view-formatters.js'", JSON.stringify(viewFormattersModuleUrl))
    .replace("'./cell-display.js'", JSON.stringify(cellDisplayModuleUrl))
    .replace("'./chart-elements.js'", JSON.stringify(chartElementsModuleUrl))
    .replace("'./link-content.js'", JSON.stringify(linkContentModuleUrl))
    .replace("'./linked-text.js'", JSON.stringify(linkedTextModuleUrl))
    .replace("'./table-region.js'", JSON.stringify(tableRegionModuleUrl))
    .replace("'./view-chrome.js'", JSON.stringify(viewChromeModuleUrl));
  const dataViewModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(dataViewSource)}`;

  const overviewDataSource = readFileSync(new URL('../../src/overview-data.js', import.meta.url), 'utf8')
    .replace("'./view-formatters.js'", JSON.stringify(viewFormattersModuleUrl))
    .replace("'./components/run-classification.js'", JSON.stringify(runClassificationModuleUrl))
    .replace("'./components/attention-rules.js'", JSON.stringify(attentionRulesModuleUrl));
  const overviewDataModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(overviewDataSource)}`;

  const presenterSource = readFileSync(new URL('../../src/presenter.js', import.meta.url), 'utf8')
    .replace("'../dashboard.json'", JSON.stringify(dashboardModuleUrl))
    .replace("'./dom.js'", JSON.stringify(domModuleUrl))
    .replace("'./styles.js'", JSON.stringify(stylesModuleUrl))
    .replace("'./octicons.js'", JSON.stringify(octiconsModuleUrl))
    .replace("'./components/cell-display.js'", JSON.stringify(cellDisplayModuleUrl))
    .replace("'./components/data-state.js'", JSON.stringify(dataStateModuleUrl))
    .replace("'./components/table-region.js'", JSON.stringify(tableRegionModuleUrl))
    .replace("'./components/view-chrome.js'", JSON.stringify(viewChromeModuleUrl))
    .replace("'./components/link-content.js'", JSON.stringify(linkContentModuleUrl))
    .replace("'./components/linked-text.js'", JSON.stringify(linkedTextModuleUrl))
    .replace("'./components/chart-elements.js'", JSON.stringify(chartElementsModuleUrl))
    .replace("'./components/ui-elements.js'", JSON.stringify(uiElementsModuleUrl))
    .replace("'./components/data-view.js'", JSON.stringify(dataViewModuleUrl))
    .replace("'./components/filter-bar.js'", JSON.stringify(filterBarModuleUrl))
    .replace("'./overview-data.js'", JSON.stringify(overviewDataModuleUrl))
    .replace("'./view-formatters.js'", JSON.stringify(viewFormattersModuleUrl));

  return `data:text/javascript;charset=utf-8,${encodeURIComponent(presenterSource)}`;
}

test('DLS-PAGE-002 DLS-PAGE-014 built-in overview page renders the report-style six-domain operational overview in browser', async ({ page }) => {
  const presenterModuleUrl = buildPresenterModuleUrl();

  await page.setContent(`
    <div id="root"></div>
    <script type="module">
      import { renderDashboard } from ${JSON.stringify(presenterModuleUrl)};

      const dashboardDocument = {
        languageVersion: '0.1.0',
        dashboard: {
          id: 'built-in-overview-render',
          title: 'Built In Overview Render',
          pages: [
            {
              id: 'overview',
              kind: 'built-in',
              page: 'overview',
              title: 'Overview',
              definition: {
                'data-state': {
                  availability: true,
                  completeness: true,
                  freshness: true
                },
                views: [
                  { id: 'workflows-source', data: { source: 'workflows' } },
                  { id: 'runs-source', data: { source: 'runs' } },
                  { id: 'usage-source', data: { source: 'usage' } },
                  { id: 'findings-source', data: { source: 'findings' } },
                  { id: 'operational-values-source', data: { source: 'operational-values' } }
                ]
              }
            },
            {
              id: 'runtime',
              kind: 'custom',
              title: 'Runtime & episodes',
              views: [
                {
                  id: 'runtime-execution-episodes',
                  title: 'Execution episodes',
                  data: { sources: ['workflows', 'runs', 'outcomes', 'usage'] },
                  mark: 'element',
                  element: 'execution-episodes'
                }
              ]
            }
          ],
          navigation: [
            { label: 'Attention', pages: ['overview'] }
          ]
        }
      };

      const sources = {
        repositories: {
          source: 'repositories',
          rows: [
            { organization: 'github', repository: 'central-agentic-ops' },
            { organization: 'github', repository: 'dashboard-service' }
          ],
          metadata: {
            'source-id': 'repositories-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T20:00:00Z',
            'retrieved-at': '2026-08-29T20:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        },
        workflows: {
          source: 'workflows',
          rows: [
            { organization: 'github', repository: 'central-agentic-ops', package: 'daily-ops', 'package-name': 'Daily Ops', 'workflow-role': 'orchestrator', workflow: '.github/workflows/daily.yml', 'workflow-active': 'true', 'rollout-mode': 'live', 'max-ai-credits': 10, 'observed-at': '2026-08-29T09:00:00Z' },
            { organization: 'github', repository: 'central-agentic-ops', package: 'daily-ops', 'package-name': 'Daily Ops', 'workflow-role': 'worker', workflow: '.github/workflows/review.yml', 'workflow-active': 'false', 'rollout-mode': 'review', 'max-ai-credits': 20, 'observed-at': '2026-08-29T09:05:00Z' }
          ],
          metadata: {
            'source-id': 'workflows-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T20:00:00Z',
            'retrieved-at': '2026-08-29T20:01:00Z',
            completeness: 'partial',
            freshness: 'stale',
            availability: 'available'
          }
        },
        runs: {
          source: 'runs',
          rows: [
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1001', 'started-at': '2026-08-29T10:00:00Z', 'run-status': 'completed', 'run-conclusion': 'success', 'rollout-mode': 'live', engine: 'openai', 'requested-model': 'gpt-4o', 'resolved-model': 'gpt-4.1' },
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1002', 'started-at': '2026-08-29T11:00:00Z', 'run-status': 'completed', 'run-conclusion': 'failure', 'rollout-mode': 'live', engine: 'openai', 'requested-model': 'gpt-4o', 'resolved-model': 'gpt-4.1' },
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/review.yml', run: '1003', 'started-at': '2026-08-29T12:00:00Z', 'run-status': 'in-progress', 'run-conclusion': 'unknown', 'rollout-mode': 'review', engine: 'anthropic', 'requested-model': 'claude-3.5', 'resolved-model': 'claude-3.7' }
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
        usage: {
          source: 'usage',
          rows: [
            { repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1001', 'rollout-mode': 'live', aic: 12, engine: 'openai', 'requested-model': 'gpt-4o', 'resolved-model': 'gpt-4.1', 'observed-at': '2026-08-29T10:05:00Z' },
            { repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1002', 'rollout-mode': 'live', aic: 18, engine: 'openai', 'requested-model': 'gpt-4o', 'resolved-model': 'gpt-4.1', 'observed-at': '2026-08-29T11:05:00Z' },
            { repository: 'central-agentic-ops', workflow: '.github/workflows/review.yml', run: '1003', 'rollout-mode': 'review', aic: 5, engine: 'anthropic', 'requested-model': 'claude-3.5', 'resolved-model': 'claude-3.7', 'observed-at': '2026-08-29T12:05:00Z' }
          ],
          metadata: {
            'source-id': 'usage-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T20:00:00Z',
            'retrieved-at': '2026-08-29T20:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        },
        findings: {
          source: 'findings',
          rows: [
            {
              finding: 'finding-2',
              'finding-summary': 'Review workflow needs triage',
              'finding-severity': 'medium',
              'finding-status': 'open',
              organization: 'github',
              repository: 'central-agentic-ops',
              workflow: '.github/workflows/review.yml',
              'observed-at': '2026-08-29T12:30:00Z',
              'issue-link': { relation: 'issue', href: 'https://example.com/issues/2', label: 'Issue 2' },
              'pull-request-link': { relation: 'pull-request', href: 'https://example.com/pulls/2', label: 'PR 2' },
              'run-link': { relation: 'run', href: 'https://example.com/runs/1003', label: 'Run 1003' }
            },
            {
              finding: 'finding-1',
              'finding-summary': 'Daily workflow regression',
              'finding-severity': 'high',
              'finding-status': 'open',
              organization: 'github',
              repository: 'central-agentic-ops',
              workflow: '.github/workflows/daily.yml',
              'observed-at': '2026-08-29T11:30:00Z',
              'issue-link': { relation: 'issue', href: 'https://example.com/issues/1', label: 'Issue 1' },
              'pull-request-link': { relation: 'pull-request', href: 'https://example.com/pulls/1', label: 'PR 1' },
              'run-link': { relation: 'run', href: 'https://example.com/runs/1002', label: 'Run 1002' }
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
        },
        'operational-values': {
          source: 'operational-values',
          rows: [
            {
              organization: 'github',
              repository: 'central-agentic-ops',
              workflow: '.github/workflows/daily.yml',
              run: '1001',
              'operational-value': 0.65,
              'operational-value-definition': 'ship-success',
              'observed-at': '2026-08-29T10:30:00Z',
              'evidence-link': { relation: 'evidence', href: 'https://example.com/evidence/1', label: 'Evidence 1' }
            },
            {
              organization: 'github',
              repository: 'central-agentic-ops',
              workflow: '.github/workflows/review.yml',
              run: '1003',
              'operational-value': 0.8,
              'operational-value-definition': 'review-quality',
              'observed-at': '2026-08-29T12:45:00Z',
              'evidence-link': { relation: 'evidence', href: 'https://example.com/evidence/2', label: 'Evidence 2' }
            }
          ],
          metadata: {
            'source-id': 'operational-values-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T20:00:00Z',
            'retrieved-at': '2026-08-29T20:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        }
      };

      document.querySelector('#root').append(renderDashboard({ document: dashboardDocument, sources }));
    </script>
  `);

  await expect(page.getByRole('heading', { name: 'Overview', exact: true, level: 1 })).toBeVisible();
  await expect(page.locator('.nav-section-label')).toHaveCount(1);
  await expect(page.locator('.nav-section-label')).toHaveText(['Attention']);
  await expect(page.locator('.overview-page')).toHaveAttribute('data-page-kind', 'custom');
  await expect(page.locator('.overview-page .custom-view')).toHaveCount(1);
  await expect(page.locator('.overview-page .layout-section')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Attention by domain', level: 2 })).toBeVisible();
  const cards = page.locator('.attention-domain-card');
  await expect(cards).toHaveCount(6);
  await expect(cards.locator('header strong')).toHaveText([
    'Runtime health',
    'Episodes & autonomy',
    'Security & controls',
    'Evidence quality',
    'Value & outcomes',
    'Cost & efficiency'
  ]);
  await expect(cards.first()).toHaveClass(/attention-domain-critical/);
  await expect(cards.first()).toContainText('1 failed');
  await expect(cards.nth(1)).toContainText('2 observed');
  expect(await cards.evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual([
    '#page-runtime',
    '#page-runtime?section=runtime-execution-episodes',
    '#page-security',
    '#page-findings',
    '#page-operational-value',
    '#page-cost'
  ]);
  await expect(page.locator('.overview-method-note')).toContainText('State key:');
  await expect(page.locator('[data-page-id="overview"] .data-state-summary')).toBeHidden();

  await page.setViewportSize({ width: 400, height: 900 });
  const firstCardBox = await cards.first().boundingBox();
  const secondCardBox = await cards.nth(1).boundingBox();
  expect(firstCardBox).not.toBeNull();
  expect(secondCardBox).not.toBeNull();
  expect(secondCardBox?.y).toBeGreaterThan(firstCardBox?.y ?? 0);

  await cards.nth(1).click();
  await expect(page).toHaveURL(/#page-runtime\?section=runtime-execution-episodes$/);
  await expect(page.locator('[data-page-id="runtime"]')).toBeVisible();
  await expect(page.locator('#runtime-execution-episodes')).toBeInViewport();
});

test('DLS-PAGE-014 DLS-PAGE-015 built-in packages page renders report-style mode filters, AIC utilization, and run trends in browser', async ({ page }) => {
  const presenterModuleUrl = buildPresenterModuleUrl();

  await page.setContent(`
    <div id="root"></div>
    <script type="module">
      import { renderDashboard } from ${JSON.stringify(presenterModuleUrl)};

      const metadata = {
        'source-id': 'packages-fixture',
        'source-kind': 'fixture',
        'as-of': '2026-08-29T20:00:00Z',
        'retrieved-at': '2026-08-29T20:01:00Z',
        completeness: 'complete',
        freshness: 'fresh',
        availability: 'available'
      };
      const documentModel = {
        languageVersion: '0.1.0',
        dashboard: {
          id: 'packages-render',
          title: 'Central Agentic Ops',
          pages: [{
            id: 'packages',
            kind: 'built-in',
            page: 'packages',
            title: 'Packages',
            description: 'Activity from centrally managed packages.',
            definition: {
              'data-state': { availability: true, completeness: true, freshness: true },
              views: [
                { id: 'package-workflows', data: { source: 'workflows' } },
                { id: 'package-runs', data: { source: 'runs' } },
                { id: 'package-usage', data: { source: 'usage' } },
                { id: 'package-trend', mark: 'element', element: 'package-run-trend', data: { sources: ['workflows', 'runs'] } }
              ]
            }
          }]
        }
      };
      const sources = {
        workflows: {
          source: 'workflows',
          rows: [
            { package: 'ambient-context', 'package-name': 'Ambient Context', workflow: '.github/workflows/ambient-context.md', 'workflow-role': 'orchestrator', 'rollout-mode': 'review', 'max-ai-credits': 250, 'package-aic-allowance': 1050, 'package-inventory-warnings': 0 },
            { package: 'aw-maintenance', 'package-name': 'AW Maintenance', workflow: '.github/workflows/aw-maintenance.md', 'workflow-role': 'orchestrator', 'rollout-mode': 'review', 'max-ai-credits': 250, 'package-aic-allowance': 1250, 'package-inventory-warnings': 1 }
          ],
          metadata
        },
        runs: {
          source: 'runs',
          rows: [
            { workflow: '.github/workflows/aw-maintenance.md', run: '1', 'started-at': '2026-08-28T10:00:00Z', 'run-conclusion': 'success', 'rollout-mode': 'review' },
            { workflow: '.github/workflows/aw-maintenance.md', run: '2', 'started-at': '2026-08-29T10:00:00Z', 'run-conclusion': 'failure', 'rollout-mode': 'live' }
          ],
          metadata
        },
        usage: {
          source: 'usage',
          rows: [
            { workflow: '.github/workflows/aw-maintenance.md', run: '1', invocation: 'a', aic: 23.9, 'rollout-mode': 'review' }
          ],
          metadata: { ...metadata, completeness: 'partial' }
        },
        findings: {
          source: 'findings',
          rows: [
            { workflow: '.github/workflows/aw-maintenance.md', run: '2', finding: 'warning-1', 'finding-kind': 'authored-warning', 'observed-at': '2026-08-29T10:05:00Z' }
          ],
          metadata
        }
      };

      document.querySelector('#root').append(renderDashboard({ document: documentModel, sources }));
    </script>
  `);

  await expect(page.getByRole('heading', { name: 'Packages', level: 1 })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.package-utilization-card')).toHaveCount(2);
  await expect(page.locator('[data-package-id="aw-maintenance"]')).toContainText('9.6%');
  await expect(page.locator('[data-package-id="ambient-context"]')).toContainText('No AIC usage was reported');
  await expect(page.getByRole('heading', { name: 'All output by package', level: 3 })).toBeVisible();
  const awMaintenanceSummary = page.locator('.package-summary-table tbody tr').filter({ hasText: 'AW Maintenance' });
  await expect(awMaintenanceSummary).toContainText('AW Maintenance');
  await expect(awMaintenanceSummary.locator('td')).toHaveText(['2', '1', '1', '1', '1', '23.9', 'Aug 29, 2026, 10:05 AM']);
  await expect(page.getByRole('heading', { name: 'All runs over time', level: 3 })).toBeVisible();
  await expect(page.locator('.package-chart-point')).toHaveCount(30);

  await page.getByRole('tab', { name: 'All' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Review' })).toHaveAttribute('aria-selected', 'true');
  await expect(awMaintenanceSummary.locator('td')).toHaveText(['1', '1', '0', '0', '1', '23.9', 'Aug 28, 2026, 10:00 AM']);
  await expect(page.getByRole('tab', { name: 'Review' })).toBeFocused();

  await page.getByRole('tab', { name: 'Live' }).click();
  await expect(page.getByRole('tab', { name: 'Live' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'Live runs over time', level: 3 })).toBeVisible();
  await expect(page.locator('.package-trend-panel header')).toContainText('1as of');

  await page.setViewportSize({ width: 600, height: 900 });
  const cards = page.locator('.package-utilization-card');
  const firstCard = await cards.nth(0).boundingBox();
  const secondCard = await cards.nth(1).boundingBox();
  expect(firstCard).not.toBeNull();
  expect(secondCard?.y).toBeGreaterThan(firstCard?.y ?? 0);
});

test('DLS-PAGE-017 renders a responsive JSON-configured filter bar and page-source export', async ({ page }) => {
  const presenterModuleUrl = buildPresenterModuleUrl();

  await page.setContent(`
    <div id="root"></div>
    <script type="module">
      import { renderDashboard } from ${JSON.stringify(presenterModuleUrl)};

      const dashboardDocument = {
        languageVersion: '0.1.0',
        dashboard: {
          id: 'filter-bar-render',
          title: 'Central Agentic Ops',
          pages: [{
            id: 'cost',
            kind: 'custom',
            title: 'Cost & efficiency',
            'filter-bar': {
              filters: ['mode:review', 'mode:live'],
              'time-range': 'All recorded',
              export: true
            },
            views: [{
              id: 'usage-count',
              data: { source: 'usage' },
              mark: 'metric',
              encoding: { value: { field: 'invocation', aggregate: 'count' } }
            }]
          }]
        }
      };
      const sources = {
        usage: {
          source: 'usage',
          rows: [{ invocation: 'usage-1', aic: 2 }],
          metadata: {
            'source-id': 'usage-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-31T16:00:00Z',
            'retrieved-at': '2026-08-31T16:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        }
      };

      document.querySelector('#root').append(renderDashboard({ document: dashboardDocument, sources }));
    </script>
  `);

  const filterBar = page.getByLabel('Dashboard filters');
  await expect(filterBar).toBeVisible();
  await expect(filterBar.getByLabel('Current filters')).toContainText('Filter2mode:review mode:live');
  await expect(filterBar.getByText('All recorded')).toBeVisible();
  const exportLink = filterBar.getByRole('link', { name: 'Export JSON' });
  await expect(exportLink).toHaveAttribute('download', 'cost.json');
  const exportPayload = await exportLink.evaluate((link) => {
    const href = link.getAttribute('href') ?? '';
    return JSON.parse(decodeURIComponent(href.slice(href.indexOf(',') + 1)));
  });
  expect(exportPayload).toMatchObject({
    page: 'cost',
    filters: ['mode:review', 'mode:live'],
    sources: {
      usage: {
        source: 'usage',
        rows: [{ invocation: 'usage-1', aic: 2 }],
        metadata: { 'source-id': 'usage-fixture' }
      }
    }
  });

  await page.setViewportSize({ width: 400, height: 900 });
  const filterControlBox = await filterBar.locator('.filter-control').boundingBox();
  const timeRangeBox = await filterBar.locator('.scope-period').boundingBox();
  expect(filterControlBox).not.toBeNull();
  expect(timeRangeBox?.y).toBeGreaterThan(filterControlBox?.y ?? 0);
});

test('DLS-PAGE-009 DLS-PAGE-014 built-in evals page renders distinguishable definitions and observations, observed subject, YES/NO/UNKNOWN result, evaluation model when available, time, provenance, and independent data state in browser', async ({ page }) => {
  const presenterModuleUrl = buildPresenterModuleUrl();

  await page.setContent(`
    <div id="root"></div>
    <script type="module">
      import { renderDashboard } from ${JSON.stringify(presenterModuleUrl)};

      const dashboardDocument = {
        languageVersion: '0.1.0',
        dashboard: {
          id: 'built-in-evals-render',
          title: 'Built In Evals Render',
          pages: [
            {
              id: 'evals',
              kind: 'built-in',
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

      const sources = {
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
      };

      document.querySelector('#root').append(renderDashboard({ document: dashboardDocument, sources }));
    </script>
  `);

  await expect(page.getByRole('heading', { name: 'Evals', exact: true, level: 1 })).toBeVisible();
  await page.locator('summary').filter({ hasText: 'Evals Evals Source' }).click();
  await expect(page.getByRole('heading', { name: 'Evals Evals Source' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Evals Observations Source' })).toBeVisible();
  await expect(page.locator('.data-state-summary')).toBeHidden();
  await expect(page.locator('[data-page-id="evals"] .custom-table').nth(0).locator('tbody tr')).toHaveCount(2);
  await expect(page.locator('[data-page-id="evals"] .custom-table').nth(1).locator('tbody tr')).toHaveCount(3);
  await expect(page.locator('[data-page-id="evals"]')).toContainText('release-risk');
  await expect(page.locator('[data-page-id="evals"]')).toContainText('UNKNOWN');
  await expect(page.locator('[data-page-id="evals"]')).toContainText('claude-3.7');
});

test('DLS-SAFE-004 DLS-SAFE-007 DLS-SAFE-008 DLS-SAFE-010 built-in findings page exposes accessible names, labeled columns, textual data states, and only safe labeled external links in browser', async ({ page }) => {
  const presenterModuleUrl = buildPresenterModuleUrl();

  await page.setContent(`
    <div id="root"></div>
    <script type="module">
      import { renderDashboard } from ${JSON.stringify(presenterModuleUrl)};

      const dashboardDocument = {
        languageVersion: '0.1.0',
        dashboard: {
          id: 'security-dashboard',
          title: 'Security Dashboard',
          pages: [
            {
              id: 'findings',
              kind: 'built-in',
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

      const sources = {
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
      };

      document.querySelector('#root').append(renderDashboard({ document: dashboardDocument, sources }));
    </script>
  `);

  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Findings', exact: true, level: 1 })).toBeVisible();
  await expect(page.locator('.data-state-summary')).toBeHidden();
  await expect(page.getByRole('columnheader', { name: 'Issue Link' })).toBeVisible();
  await expect(page.locator('[data-page-id="findings"] .custom-table tbody td').first()).toContainText('<img src=x onerror=alert(1)>');
  await expect(page.locator('[data-page-id="findings"] .custom-table tbody img')).toHaveCount(0);

  const issueLink = page.getByRole('link', { name: 'Issue 1 label' });
  await expect(issueLink).toBeVisible();
  await expect(issueLink).toHaveAttribute('href', 'https://example.com/issues/1');
  await expect(issueLink).toHaveAttribute('target', '_blank');
  await expect(issueLink).toHaveAttribute('rel', 'noopener noreferrer');
});

test('DLS-VIEW-013 DLS-VIEW-014 DLS-VIEW-015 DLS-SAFE-006 custom views render available, empty, and unavailable states with only context-permitted observations in browser', async ({ page }) => {
  const presenterModuleUrl = buildPresenterModuleUrl();

  await page.setContent(`
    <div id="root"></div>
    <script type="module">
      import { renderDashboard } from ${JSON.stringify(presenterModuleUrl)};

      const dashboardDocument = {
        languageVersion: '0.1.0',
        dashboard: {
          id: 'custom-dashboard',
          title: 'Custom Dashboard',
          pages: [
            {
              id: 'custom-views',
              kind: 'custom',
              title: 'Custom Views',
              views: [
                {
                  id: 'total-aic',
                  title: 'Total AI Credits',
                  data: {
                    source: 'usage',
                    filters: {
                      'rollout-mode': ['review', 'live']
                    }
                  },
                  mark: 'metric',
                  encoding: {
                    value: {
                      field: 'aic',
                      type: 'quantitative',
                      aggregate: 'sum'
                    }
                  }
                },
                {
                  id: 'findings-table',
                  title: 'Findings Table',
                  data: {
                    source: 'findings',
                    scope: {
                      repositories: ['central-agentic-ops']
                    },
                    time: {
                      start: '2026-08-29T00:00:00Z',
                      end: '2026-08-30T00:00:00Z'
                    }
                  },
                  mark: 'table',
                  encoding: {
                    columns: [
                      { field: 'finding-summary' },
                      { field: 'finding-severity' },
                      { field: 'finding-status' }
                    ],
                    href: {
                      field: 'pull-request-link'
                    }
                  }
                },
                {
                  id: 'daily-runs',
                  title: 'Daily Runs',
                  data: {
                    source: 'runs'
                  },
                  mark: 'chart',
                  encoding: {
                    x: {
                      field: 'started-at',
                      type: 'temporal',
                      'time-unit': 'day'
                    },
                    y: {
                      field: 'run',
                      type: 'quantitative',
                      aggregate: 'count'
                    },
                    color: {
                      field: 'run-conclusion',
                      type: 'nominal'
                    },
                    href: {
                      field: 'run-link'
                    }
                  }
                },
                {
                  id: 'empty-usage',
                  title: 'Empty Usage',
                  data: {
                    source: 'empty-usage'
                  },
                  mark: 'metric',
                  encoding: {
                    value: {
                      field: 'aic',
                      type: 'quantitative',
                      aggregate: 'sum'
                    }
                  }
                },
                {
                  id: 'missing-source',
                  title: 'Missing Source',
                  data: {
                    source: 'missing-source'
                  },
                  mark: 'table',
                  encoding: {
                    columns: [
                      { field: 'finding-summary' }
                    ]
                  }
                }
              ]
            }
          ]
        }
      };

      const sources = {
        usage: {
          source: 'usage',
          rows: [
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1001', engine: 'actions', 'requested-model': 'gpt-4o', 'resolved-model': 'gpt-4.1', 'rollout-mode': 'live', aic: 2, 'observed-at': '2026-08-29T10:00:00Z' },
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1002', engine: 'actions', 'requested-model': 'gpt-4o', 'resolved-model': 'gpt-4.1', 'rollout-mode': 'review', aic: 3, 'observed-at': '2026-08-29T11:00:00Z' }
          ],
          metadata: {
            'source-id': 'usage-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T20:00:00Z',
            'retrieved-at': '2026-08-29T20:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        },
        findings: {
          source: 'findings',
          rows: [
            {
              finding: 'finding-1',
              organization: 'github',
              repository: 'central-agentic-ops',
              'observed-at': '2026-08-29T12:00:00Z',
              'finding-summary': 'Unsafe dependency',
              'finding-severity': 'high',
              'finding-status': 'open',
              'pull-request-link': {
                relation: 'pull-request',
                href: 'https://example.com/pull/1',
                label: 'PR 1'
              }
            },
            {
              finding: 'finding-2',
              organization: 'github',
              repository: 'other-repo',
              'observed-at': '2026-08-29T13:00:00Z',
              'finding-summary': 'Out of scope finding',
              'finding-severity': 'medium',
              'finding-status': 'resolved',
              'pull-request-link': {
                relation: 'pull-request',
                href: 'https://example.com/pull/2',
                label: 'PR 2'
              }
            },
            {
              finding: 'finding-3',
              organization: 'github',
              repository: 'central-agentic-ops',
              'observed-at': '2026-08-30T01:00:00Z',
              'finding-summary': 'Out of range finding',
              'finding-severity': 'low',
              'finding-status': 'open'
            }
          ],
          metadata: {
            'source-id': 'findings-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T20:00:00Z',
            'retrieved-at': '2026-08-29T20:01:00Z',
            completeness: 'partial',
            freshness: 'stale',
            availability: 'available'
          }
        },
        runs: {
          source: 'runs',
          rows: [
            {
              run: '1001',
              'started-at': '2026-08-29T10:00:00Z',
              'run-conclusion': 'success',
              'run-link': { relation: 'run', href: 'https://github.com/github/central-agentic-ops/actions/runs/1001', label: 'Run 1001' }
            },
            {
              run: '1002',
              'started-at': '2026-08-29T11:00:00Z',
              'run-conclusion': 'failure',
              'run-link': { relation: 'run', href: 'https://github.com/github/central-agentic-ops/actions/runs/1002', label: 'Run 1002' }
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
        'empty-usage': {
          source: 'empty-usage',
          rows: [],
          metadata: {
            'source-id': 'empty-usage-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T20:00:00Z',
            'retrieved-at': '2026-08-29T20:01:00Z',
            completeness: 'unknown',
            freshness: 'unknown',
            availability: 'empty'
          }
        }
      };

      document.querySelector('#root').append(renderDashboard({ document: dashboardDocument, sources }));
    </script>
  `);

  await expect(page.getByRole('heading', { name: 'Custom Views', exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Total AI Credits' })).toBeVisible();
  await expect(page.locator('[data-metric-value="aic"]')).toHaveText('5');
  const metricSection = page.locator('.page-section').filter({ has: page.getByRole('heading', { name: 'Total AI Credits' }) });
  await expect(metricSection).toContainText('Source: usage');
  await expect(metricSection).toContainText('Filters: {"rollout-mode":["review","live"]}');

  await expect(page.getByRole('heading', { name: 'Findings Table' })).toBeVisible();
  await expect(page.locator('.custom-table tbody tr')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'PR 1' })).toHaveAttribute('href', 'https://example.com/pull/1');
  const tableSection = page.locator('.page-section').filter({ has: page.getByRole('heading', { name: 'Findings Table' }) });
  await expect(tableSection).toContainText('Scope: {"repositories":["central-agentic-ops"]}');
  await expect(tableSection).toContainText('Time: {"start":"2026-08-29T00:00:00Z","end":"2026-08-30T00:00:00Z"}');
  await expect(tableSection).not.toContainText('Out of scope finding');
  await expect(tableSection).not.toContainText('Out of range finding');

  await expect(page.getByRole('heading', { name: 'Daily Runs' })).toBeVisible();
  await expect(page.locator('.chart-default')).toHaveCount(0);
  await expect(page.locator('[data-chart-legend="text"]')).toHaveCount(0);
  await expect(page.locator('[data-chart-legend="visual"] li')).toHaveCount(2);
  await expect(page.locator('[data-chart-legend="visual"] li span')).toHaveText(['failure', 'success']);
  await expect(page.locator('.custom-chart-table tbody tr')).toHaveCount(2);
  await expect(page.getByRole('link', { name: 'Run 1001' })).toHaveAttribute(
    'href',
    'https://github.com/github/central-agentic-ops/actions/runs/1001'
  );
  await expect(page.locator('.page-section').filter({ has: page.getByRole('heading', { name: 'Daily Runs' }) }).locator('.view-source')).toHaveCount(1);

  await expect(page.getByRole('heading', { name: 'Empty Usage' })).toBeVisible();
  await expect(page.locator('[data-view-availability="empty"]')).toHaveText('No observations matched the effective context.');
  const emptySection = page.locator('.page-section').filter({ has: page.getByRole('heading', { name: 'Empty Usage' }) });
  await expect(emptySection).toContainText('Affected source: empty-usage');

  await expect(page.getByRole('heading', { name: 'Missing Source' })).toBeVisible();
  await expect(page.locator('[data-view-availability="unavailable"]')).toHaveText('This view is unavailable.');
  const unavailableSection = page.locator('.page-section').filter({ has: page.getByRole('heading', { name: 'Missing Source' }) });
  await expect(unavailableSection).toContainText('Source unavailable: missing-source');
});

test('DLS-SAFE-007 DLS-SAFE-008 keyboard navigation moves across labeled page sections in browser', async ({ page }) => {
  const presenterModuleUrl = buildPresenterModuleUrl();

  await page.setContent(`
    <div id="root"></div>
    <script type="module">
      import { renderDashboard, enableDashboardKeyboardNavigation } from ${JSON.stringify(presenterModuleUrl)};

      const dashboardDocument = {
        languageVersion: '0.1.0',
        dashboard: {
          id: 'runs-dashboard',
          title: 'Runs Dashboard',
          pages: [
            {
              id: 'runs',
              kind: 'built-in',
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

      const sources = {
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
            { run: '1001', 'outcome-state': 'accepted' }
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
      };

      const root = document.querySelector('#root');
      const dashboard = renderDashboard({ document: dashboardDocument, sources });
      root.append(dashboard);
      enableDashboardKeyboardNavigation(dashboard);
    </script>
  `);

  const sections = page.locator('[data-page-id="runs"] .page-section');
  await expect(sections).toHaveCount(2);
  await expect(page.locator('#runs-runs-runs-source-heading')).toHaveText('Runs Runs Source');
  await expect(page.locator('#runs-runs-outcomes-source-heading')).toHaveText('Runs Outcomes Source');

  await sections.nth(0).focus();
  await page.keyboard.press('ArrowDown');
  await expect(sections.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(sections.nth(0)).toBeFocused();
});

test('repository page template follows its JSON-declared hash query route in browser', async ({ page }) => {
  const presenterModuleUrl = buildPresenterModuleUrl();
  await page.goto('about:blank#page-repository-detail?repository=octo-org%2Focto-repo');
  await page.setContent(`
    <div id="root"></div>
    <script type="module">
      import { renderDashboard } from ${JSON.stringify(presenterModuleUrl)};
      const metadata = {
        'source-id': 'workflows-fixture',
        'source-kind': 'fixture',
        'as-of': '2026-08-30T08:00:00Z',
        'retrieved-at': '2026-08-30T08:01:00Z',
        completeness: 'complete',
        freshness: 'fresh',
        availability: 'available'
      };
      const dashboardDocument = {
        languageVersion: '0.1.0',
        dashboard: {
          id: 'repository-route',
          title: 'Repository route',
          pages: [{
            id: 'repository-detail',
            kind: 'custom',
            title: 'Repository',
            description: 'Repository workflows.',
            route: { 'hash-query-parameter': 'repository' },
            views: [{
              id: 'repository-workflows',
              title: 'Agentic workflows',
              data: { sources: ['workflows'] },
              mark: 'element',
              element: 'repository-workflows'
            }]
          }]
        }
      };
      const sources = {
        workflows: {
          source: 'workflows',
          metadata,
          rows: [
            { organization: 'octo-org', repository: 'octo-repo', workflow: 'review.md', 'workflow-name': 'Review', 'workflow-active': 'true' },
            { organization: 'other-org', repository: 'other-repo', workflow: 'other.md', 'workflow-name': 'Other', 'workflow-active': 'true' }
          ]
        }
      };
      document.querySelector('#root').append(renderDashboard({ document: dashboardDocument, sources }));
    </script>
  `);

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('octo-org/octo-repo');
  await expect(page.locator('.repository-view')).toHaveAttribute('data-repository', 'octo-org/octo-repo');
  await expect(page.locator('.repository-workflow-table')).toContainText('Review');
  await expect(page.locator('.repository-workflow-table')).not.toContainText('Other');

  await page.evaluate(() => {
    window.location.hash = '#page-repository-detail?repository=other-org%2Fother-repo';
  });

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('other-org/other-repo');
  await expect(page.locator('.repository-workflow-table')).toContainText('Other');
  await expect(page.locator('.repository-workflow-table')).not.toContainText('Review');
});

test('declarative tables expose report-style facets and progressive catalog disclosure', async ({ page }) => {
  const presenterModuleUrl = buildPresenterModuleUrl();

  await page.setContent(`
    <div id="root"></div>
    <script type="module">
      import { renderDashboard } from ${JSON.stringify(presenterModuleUrl)};

      const rows = Array.from({ length: 30 }, (_, index) => ({
        workflow: \`workflow-\${index + 1}\`,
        'rollout-mode': index % 2 === 0 ? 'review' : 'live'
      }));
      document.querySelector('#root').append(renderDashboard({
        document: {
          languageVersion: '0.1.0',
          dashboard: {
            id: 'catalog-dashboard',
            title: 'Catalog Dashboard',
            pages: [{
              id: 'catalog',
              kind: 'custom',
              title: 'Catalog',
              views: [{
                id: 'workflow-catalog',
                title: 'Workflow catalog',
                data: { source: 'workflows' },
                mark: 'table',
                encoding: {
                  columns: [
                    { field: 'workflow', type: 'nominal' },
                    { field: 'rollout-mode', type: 'nominal', title: 'Mode' }
                  ]
                }
              }]
            }]
          }
        },
        sources: {
          workflows: {
            source: 'workflows',
            rows,
            metadata: {
              'source-id': 'workflow-catalog-fixture',
              'source-kind': 'fixture',
              'as-of': '2026-08-30T20:00:00Z',
              'retrieved-at': '2026-08-30T20:01:00Z',
              completeness: 'complete',
              freshness: 'fresh',
              availability: 'available'
            }
          }
        }
      }));
    </script>
  `);

  const tableRows = page.locator('.custom-table tbody tr');
  const visibleRows = page.locator('.custom-table tbody tr:visible');
  await expect(tableRows).toHaveCount(30);
  await expect(visibleRows).toHaveCount(25);
  await expect(page.locator('.table-filter-result')).toHaveText('Showing 25 of 30 results');

  await page.getByRole('button', { name: 'Show 25 more' }).click();
  await expect(visibleRows).toHaveCount(30);

  await page.locator('[data-table-facet="rollout-mode"]').selectOption('review');
  await expect(visibleRows).toHaveCount(15);
  await expect(page.locator('.table-filter-result')).toHaveText('Showing 15 of 15 results');

  await page.getByRole('searchbox', { name: 'Filter Workflow catalog' }).fill('workflow-29');
  await expect(visibleRows).toHaveCount(1);
  await expect(visibleRows).toContainText('workflow-29');
  await expect(page.locator('.table-filter-result')).toHaveText('Showing 1 of 1 result');
});

test('DLS-SAFE-004 runtime links with embedded credentials, ftp schemes, and blank labels are not exposed in browser output', async ({ page }) => {
  const presenterModuleUrl = buildPresenterModuleUrl();

  await page.setContent(`
    <div id="root"></div>
    <script type="module">
      import { renderDashboard } from ${JSON.stringify(presenterModuleUrl)};

      const dashboardDocument = {
        languageVersion: '0.1.0',
        dashboard: {
          id: 'credential-link-dashboard',
          title: 'Credential Link Dashboard',
          pages: [{
            id: 'credential-links',
            kind: 'custom',
            title: 'Credential Links',
            views: [
              {
                id: 'credential-links-table',
                title: 'Credential Links Table',
                data: { source: 'runs' },
                mark: 'table',
                encoding: {
                  columns: [{ field: 'run' }],
                  href: { field: 'run-link' }
                }
              },
              {
                id: 'credential-links-metric',
                title: 'Credential Links Metric',
                data: { source: 'runs' },
                mark: 'metric',
                encoding: {
                  value: { field: 'run', type: 'nominal', aggregate: 'count' },
                  href: { field: 'run-link' }
                }
              }
            ]
          }]
        }
      };

      const sources = {
        runs: {
          source: 'runs',
          rows: [
            { run: '1', 'run-link': { href: 'https://user:secret@example.com/runs/1', label: 'Credentialed Run' } },
            { run: '2', 'run-link': { href: 'ftp://example.com/runs/2', label: 'FTP Run' } },
            { run: '3', 'run-link': { href: 'https://example.com/runs/3', label: '   ' } },
            { run: '4', 'run-link': { href: 'https://example.com/runs/4', label: 'Run 4' } }
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
        }
      };

      document.querySelector('#root').append(renderDashboard({ document: dashboardDocument, sources }));
    </script>
  `);

  await expect(page.getByRole('heading', { name: 'Credential Links', level: 1 })).toBeVisible();
  await expect(page.locator('.custom-table a')).toHaveText('4');
  await expect(page.locator('.metric-link a')).toHaveText('Run 4');
  await expect(page.locator('a[href*="user:secret@"]').first()).toHaveCount(0);
  await expect(page.locator('a[href^="ftp:"]').first()).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('Credentialed Run');
  await expect(page.locator('body')).not.toContainText('FTP Run');
});
