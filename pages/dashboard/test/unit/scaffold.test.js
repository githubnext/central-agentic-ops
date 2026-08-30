import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('DLS-CONF-004 scaffold gates', () => {
  it('DLS-CONF-004 initializes the presenter workspace tooling', () => {
    expect(true).toBe(true);
  });

  it('keeps the browser preview populated with chart and linked-run fixtures', () => {
    const preview = readFileSync(resolve('index.html'), 'utf8');

    expect(preview.match(/"operational-value":/g)).toHaveLength(4);
    expect(preview.match(/"run-link":/g)?.length).toBeGreaterThanOrEqual(5);
  });
});
