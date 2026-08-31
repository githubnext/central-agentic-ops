// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderCellDisplay } from '../../src/components/cell-display.js';

describe('table cell display helper', () => {
  it('DLS-VIEW-004 renders JSON-selected display types through one generic helper', () => {
    /** @param {unknown} value */
    const toText = (value) => value == null || value === '' ? 'unknown' : String(value);

    const mode = renderCellDisplay('mode', 'live', toText);
    const activeState = renderCellDisplay('active-state', 'true', toText);
    const status = renderCellDisplay('status', 'failure', toText);

    expect(mode).toBeInstanceOf(HTMLElement);
    expect(/** @type {HTMLElement} */ (mode).className).toBe('mode-badge mode-live');
    expect(activeState).toBeInstanceOf(HTMLElement);
    expect(/** @type {HTMLElement} */ (activeState).className).toBe('status status-success');
    expect(status).toBeInstanceOf(HTMLElement);
    expect(/** @type {HTMLElement} */ (status).className).toBe('status status-danger');
    expect(renderCellDisplay(undefined, 'plain', toText)).toBe('plain');
    expect(renderCellDisplay('unsupported', null, toText)).toBe('unknown');
  });
});
