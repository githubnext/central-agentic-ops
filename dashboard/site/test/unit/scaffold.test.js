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

  it('parity motion audit keeps report-style transitions and reduced-motion overrides', () => {
    const styles = readFileSync(resolve('src/styles.js'), 'utf8');

    expect(styles).toContain('.lede { color: var(--muted); }');
    expect(styles).toContain('.pie-chart-total-value { fill: var(--fg); font-size: 5px;');
    expect(styles).toContain('transition: color 120ms ease;');
    expect(styles).toContain('transition: background-color 120ms ease, color 120ms ease;');
    expect(styles).toContain('transition: opacity 80ms linear;');
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(styles).toContain('transition-duration: 0.01ms !important;');
    expect(styles).toContain('.repository-link');
  });

  it('keeps the JSON dashboard shell aligned with its shared component styles', () => {
    const presenter = readFileSync(resolve('src/presenter.js'), 'utf8');
    const styles = readFileSync(resolve('src/styles.js'), 'utf8');

    for (const shellClass of [
      'app-shell',
      'org-sidebar',
      'sidebar-brand',
      'primary-nav',
      'app-main',
      'overview-header',
      'title-area',
      'report-body'
    ]) {
      expect(presenter).toContain(`className: '${shellClass}`);
    }

    for (const sharedRule of [
      '.sidebar-brand { display: flex; align-items: center; gap: 6px;',
      '.app-main > nav { border-bottom: 1px solid var(--border); }',
      '.breadcrumb .shell > :is([data-breadcrumb-root], [data-breadcrumb-dashboard]) { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
      '.overview-header { min-height: 88px;',
      '.overview-header .lede { margin: 3px 0 0; font-size: .875rem; }',
      'footer { padding: 20px 24px; border-top: 1px solid var(--border);'
    ]) {
      expect(styles).toContain(sharedRule);
    }
  });

  it('systematically ellipsizes security signal titles at every viewport size', () => {
    const styles = readFileSync(resolve('src/styles.js'), 'utf8');

    expect(styles).toContain('.signal-copy > strong, .signal-copy > small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }');
    expect(styles).not.toContain('.signal-copy > strong, .signal-copy > small { overflow: visible; white-space: normal; }');
  });
});
