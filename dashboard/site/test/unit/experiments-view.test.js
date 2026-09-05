// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import dashboardDocument from '../../dashboard.json';

describe('experiments view', () => {
  it('places an actionable experiment summary under Explore', () => {
    const dashboard = dashboardDocument.dashboard;
    const page = dashboard.pages.find((candidate) => candidate.id === 'experiments');
    const explore = dashboard.navigation.find((group) => group.label === 'Explore');

    expect(explore.pages).toContain('experiments');
    expect(page.icon).toBe('beaker');
    expect(page.definition.views[0]).toMatchObject({
      id: 'experiment-state-distribution',
      mark: 'chart',
      chart: 'pie',
      data: { source: 'grader-observations' },
      encoding: {
        x: { field: 'maturity-status', title: 'Experiment state' }
      }
    });

    const progress = page.definition.views.find((view) => view.id === 'experiment-progress');
    expect(progress.data.source).toBe('grader-observations');
    expect(progress.encoding.columns.map((column) => column.field)).toEqual([
      'experiment',
      'grader',
      'value',
      'status',
      'maturity-status',
      'observed-at'
    ]);
    expect(progress.encoding.actions[0]).toMatchObject({
      label: 'Review ready value',
      when: { field: 'maturity-status', equals: 'matured' }
    });

    const evalResults = page.definition.views.find((view) => view.id === 'experiment-eval-results');
    expect(evalResults.data.source).toBe('eval-observations');
    expect(evalResults.encoding.columns.map((column) => column.field)).toContain('eval-result');
    expect(page.definition.views.filter((view) => view.disclosure !== 'supplemental')).toHaveLength(4);
  });
});
