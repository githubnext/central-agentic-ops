// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createModeTabs, renderNavTabs } from '../../src/components/tab-nav.js';

describe('tab-nav', () => {
  it('DLS-A11Y-001 creates keyboard-navigable mode tabs with roving tabindex', () => {
    const onSelect = vi.fn();
    const { element, selectValue } = createModeTabs({
      className: 'mode-tabs',
      ariaLabel: 'Filter by mode',
      panelId: 'mode-panel',
      tabs: [
        { value: 'all', label: 'All' },
        { value: 'review', label: 'Review' },
        { value: 'live', label: 'Live' }
      ],
      selectedValue: 'all',
      onSelect
    });

    document.body.append(element);
    const tabs = /** @type {HTMLButtonElement[]} */ ([...element.querySelectorAll('[role="tab"]')]);
    expect(element.getAttribute('role')).toBe('tablist');
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);

    tabs[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(onSelect).toHaveBeenLastCalledWith('review');
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([-1, 0, -1]);
    expect(document.activeElement).toBe(tabs[1]);

    tabs[1]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(onSelect).toHaveBeenLastCalledWith('live');
    expect(document.activeElement).toBe(tabs[2]);

    selectValue('all');
    expect(onSelect).toHaveBeenLastCalledWith('all');
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
  });

  it('renders repository and package navigation tabs with current-page markers', () => {
    const rendered = renderNavTabs({
      className: 'repository-tabs',
      ariaLabel: 'Repository views',
      tabs: [
        { view: 'insights', label: 'Insights', icon: 'graph', href: '#page-workflow-runtime', current: false },
        { view: 'reports', label: 'Reports', icon: 'issue', href: '#page-workflow-detail', current: true }
      ]
    });

    expect(rendered.getAttribute('aria-label')).toBe('Repository views');
    expect([...rendered.querySelectorAll('a')].map((link) => link.getAttribute('data-tab-view'))).toEqual(['insights', 'reports']);
    expect(rendered.querySelector('[aria-current="page"]')?.textContent).toBe('Reports');
    expect(rendered.querySelectorAll('.octicon')).toHaveLength(2);
  });
});
