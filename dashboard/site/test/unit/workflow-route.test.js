// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { parseWorkflowRoute, workflowRouteValue } from '../../src/components/workflow-route.js';

describe('workflow-route helpers', () => {
  it('formats and parses valid workflow routes', () => {
    const value = workflowRouteValue('githubnext/central-agentic-ops', '.github/workflows/ambient-context.md');

    expect(value).toBe('githubnext/central-agentic-ops:.github/workflows/ambient-context.md');
    expect(parseWorkflowRoute(value)).toEqual({
      repository: 'githubnext/central-agentic-ops',
      workflow: '.github/workflows/ambient-context.md'
    });
  });

  it('rejects invalid, missing, and unavailable workflow route inputs', () => {
    expect(parseWorkflowRoute(null)).toBeNull();
    expect(parseWorkflowRoute('')).toBeNull();
    expect(parseWorkflowRoute('githubnext/central-agentic-ops')).toBeNull();
    expect(parseWorkflowRoute('<invalid>')).toBeNull();
    expect(parseWorkflowRoute('githubnext/central-agentic-ops:.github/workflows/../ambient-context.md')).toBeNull();
    expect(parseWorkflowRoute('githubnext/central-agentic-ops:.github/workflows/ambient-context.yml')).toBeNull();
    expect(parseWorkflowRoute(`githubnext/central-agentic-ops:.github/workflows/ambient-context.md${String.fromCharCode(10)}`)).toBeNull();
  });
});
