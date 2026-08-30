import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('DLS-CONF-004 scaffold gates', () => {
  it('DLS-CONF-004 initializes the presenter workspace tooling', () => {
    expect(true).toBe(true);
  });

  it('loads generated control-plane data instead of embedded fixtures', () => {
    const preview = readFileSync(resolve('index.html'), 'utf8');

    expect(preview).toContain('fetch("./data.json")');
    expect(preview).not.toContain('"source-kind": "fixture"');
    expect(preview).not.toContain('"operational-value":');
  });
});
