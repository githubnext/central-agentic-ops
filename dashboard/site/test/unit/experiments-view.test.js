// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('experiments view', () => {
  it('places an actionable experiment summary under Explore', () => {
    const dashboardDocument = JSON.parse(readFileSync(resolve('dashboard.json'), 'utf8'));
    const dashboard = dashboardDocument.dashboard;
    const page = dashboard.pages.find((/** @type {{ id: string }} */ candidate) => candidate.id === 'experiments');
    const explore = dashboard.navigation.find((/** @type {{ label: string }} */ group) => group.label === 'Explore');

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

    const progress = page.definition.views.find((/** @type {{ id: string }} */ view) => view.id === 'experiment-progress');
    expect(progress.data.source).toBe('grader-observations');
    expect(progress.encoding.columns.map((/** @type {{ field: string }} */ column) => column.field)).toEqual([
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

    const evalResults = page.definition.views.find((/** @type {{ id: string }} */ view) => view.id === 'experiment-eval-results');
    expect(evalResults.data.source).toBe('eval-observations');
    expect(evalResults.encoding.columns.map((/** @type {{ field: string }} */ column) => column.field)).toContain('eval-result');
    expect(page.definition.views.filter((/** @type {{ disclosure?: string }} */ view) => view.disclosure !== 'supplemental')).toHaveLength(4);
  });
});
