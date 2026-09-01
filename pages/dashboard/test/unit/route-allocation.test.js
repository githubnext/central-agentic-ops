// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { dispatchRouteAllocation } from '../../src/components/route-allocation.js';

describe('dispatchRouteAllocation', () => {
  it('dispatches the shared bubbling dashboard route allocation event', () => {
    const host = document.createElement('div');
    const root = document.createElement('section');
    host.append(root);
    const listener = vi.fn();
    host.addEventListener('dashboard-route-allocation', listener);

    dispatchRouteAllocation(root, {
      title: 'Workflow title',
      description: 'Allocated dashboard route.',
      mode: 'review',
      navigationPage: 'workflows',
      breadcrumbs: [{ label: 'Workflows', href: '#page-workflows' }],
      titleLink: { href: 'https://example.test/item/1', label: '#1' }
    });

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0]).toBeInstanceOf(CustomEvent);
    expect(listener.mock.calls[0][0].bubbles).toBe(true);
    expect(listener.mock.calls[0][0].detail).toEqual({
      title: 'Workflow title',
      description: 'Allocated dashboard route.',
      mode: 'review',
      navigationPage: 'workflows',
      breadcrumbs: [{ label: 'Workflows', href: '#page-workflows' }],
      titleLink: { href: 'https://example.test/item/1', label: '#1' }
    });
  });
});
