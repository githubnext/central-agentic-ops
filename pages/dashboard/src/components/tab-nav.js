/**
 * Generic dashboard navigation tabs and mode tablists.
 */

import { h } from '../dom.js';
import { octicon } from '../octicons.js';

/**
 * @typedef {{
 *   view: string,
 *   label: string,
 *   icon?: string,
 *   href?: string,
 *   current?: boolean
 * }} NavTab
 */

/**
 * @typedef {{
 *   className: string,
 *   ariaLabel: string,
 *   tabs: NavTab[]
 * }} NavTabsOptions
 */

/**
 * @typedef {{
 *   value: string,
 *   label: string
 * }} ModeTab
 */

/**
 * @typedef {{
 *   className: string,
 *   ariaLabel: string,
 *   panelId: string,
 *   tabs: ModeTab[],
 *   selectedValue: string,
 *   onSelect: (value: string) => void
 * }} ModeTabsOptions
 */

/**
 * @param {NavTabsOptions} options
 * @returns {HTMLElement}
 */
export function renderNavTabs(options) {
  return h(
    'nav',
    { className: options.className, 'aria-label': options.ariaLabel },
    ...options.tabs.map((tab) => h(
      'a',
      { href: tab.href, 'aria-current': tab.current ? 'page' : undefined, 'data-tab-view': tab.view },
      tab.icon ? octicon(tab.icon) : null,
      h('span', null, tab.label)
    ))
  );
}

/**
 * @param {ModeTabsOptions} options
 * @returns {{ element: HTMLElement, tabByValue: Map<string, HTMLButtonElement>, selectValue: (value: string, focus?: boolean) => void }}
 */
export function createModeTabs(options) {
  const tabByValue = new Map();
  let selectedValue = options.selectedValue;

  /**
   * @param {string} value
   * @param {boolean} [focus]
   */
  const selectValue = (value, focus = false) => {
    if (![...tabByValue.keys()].includes(value)) return;
    selectedValue = value;
    for (const [tabValue, tab] of tabByValue) {
      const selected = tabValue === selectedValue;
      tab.setAttribute('aria-selected', selected ? 'true' : 'false');
      tab.tabIndex = selected ? 0 : -1;
      if (tab.dataset.tabValue === tabValue) tab.dataset.tabValue = tabValue;
    }
    if (focus) tabByValue.get(selectedValue)?.focus();
    options.onSelect(selectedValue);
  };

  const element = h(
    'div',
    {
      className: options.className,
      role: 'tablist',
      'aria-label': options.ariaLabel,
      'aria-orientation': 'horizontal'
    },
    ...options.tabs.map((tabInfo) => {
      const button = /** @type {HTMLButtonElement} */ (h(
        'button',
        {
          type: 'button',
          role: 'tab',
          id: `${options.panelId}-${tabInfo.value}-tab`,
          'aria-controls': options.panelId,
          'aria-selected': tabInfo.value === selectedValue ? 'true' : 'false',
          tabIndex: tabInfo.value === selectedValue ? 0 : -1,
          dataset: { tabValue: tabInfo.value, packageMode: tabInfo.value, reportMode: tabInfo.value },
          onclick: () => selectValue(tabInfo.value),
          onkeydown: (/** @type {KeyboardEvent} */ event) => {
            const values = options.tabs.map((entry) => entry.value);
            const currentIndex = values.indexOf(tabInfo.value);
            let nextIndex = null;
            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % values.length;
            if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + values.length) % values.length;
            if (event.key === 'Home') nextIndex = 0;
            if (event.key === 'End') nextIndex = values.length - 1;
            if (nextIndex !== null) {
              event.preventDefault();
              selectValue(values[nextIndex], true);
            }
          }
        },
        tabInfo.label
      ));
      tabByValue.set(tabInfo.value, button);
      return button;
    })
  );

  return { element, tabByValue, selectValue };
}
