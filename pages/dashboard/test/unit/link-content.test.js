// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { findFirstLink, findLink, renderExternalLink, renderLinkedValueWithExternalLink, renderOutcomeLink, renderWorkflowRunLink, resolveTitleLink } from '../../src/components/link-content.js';

describe('link content helpers', () => {
  it('DLS-SAFE-004 finds only safe https links with non-empty labels', () => {
    expect(findLink({ link: { href: 'https://example.com/run/4', label: 'Run 4' } }, 'link')).toEqual({
      href: 'https://example.com/run/4',
      label: 'Run 4'
    });
    expect(findLink({ link: { href: 'https://user:secret@example.com/run/1', label: 'Credentialed Run' } }, 'link')).toBeNull();
    expect(findLink({ link: { href: 'ftp://example.com/run/2', label: 'FTP Run' } }, 'link')).toBeNull();
    expect(findLink({ link: { href: 'https://example.com/run/3', label: '   ' } }, 'link')).toBeNull();
    expect(findLink({ link: 'https://example.com/run/4' }, 'link')).toBeNull();
  });

  it('DLS-SAFE-004 returns the first available safe link from a row collection', () => {
    const link = findFirstLink([
      { link: { href: 'ftp://example.com/run/2', label: 'FTP Run' } },
      { link: { href: 'https://example.com/run/4', label: 'Run 4' } },
      { link: { href: 'https://example.com/run/5', label: 'Run 5' } }
    ], 'link');

    expect(link).toEqual({ href: 'https://example.com/run/4', label: 'Run 4' });
  });

  it('uses a presentation-only dashboard route while retaining the external repository href', () => {
    const link = findLink({
      'repository-link': {
        href: 'https://github.com/octo-org/platform',
        label: 'View octo-org/platform on GitHub',
        'dashboard-href': '#page-repository-detail?repository=octo-org%2Fplatform',
        'dashboard-label': 'View octo-org/platform repository dashboard'
      }
    }, 'repository-link');

    expect(link).toEqual({
      href: '#page-repository-detail?repository=octo-org%2Fplatform',
      label: 'View octo-org/platform repository dashboard',
      externalHref: 'https://github.com/octo-org/platform'
    });
    const anchor = renderExternalLink(/** @type {NonNullable<typeof link>} */ (link));
    expect(anchor.getAttribute('target')).toBeNull();
    expect(anchor.getAttribute('rel')).toBeNull();
    expect(anchor.querySelector('.octicon-external-link')).toBeNull();
  });

  it('DLS-SAFE-010 renders labeled external links and optional linked value content', () => {
    const link = { href: 'https://example.com/run/4', label: 'Run 4' };
    const anchor = renderExternalLink(link);
    const linkedValue = /** @type {Array<string | HTMLElement | null>} */ (renderLinkedValueWithExternalLink('Summary', link));
    const plainValue = renderLinkedValueWithExternalLink('Summary', null);

    expect(anchor.getAttribute('href')).toBe('https://example.com/run/4');
    expect(anchor.getAttribute('target')).toBe('_blank');
    expect(anchor.getAttribute('rel')).toBe('noopener noreferrer');
    expect(anchor.getAttribute('aria-label')).toBe('Run 4');
    expect(anchor.textContent).toContain('Run 4');
    expect(Array.isArray(linkedValue)).toBe(true);
    expect(linkedValue).toHaveLength(3);
    expect(linkedValue[0]).toBe('Summary');
    expect(linkedValue[1]).toBe(' ');
    expect(linkedValue[2]).toBeInstanceOf(HTMLElement);
    expect(plainValue).toBe('Summary');
  });

  it('renders workflow run labels as safe external links with a plain-text fallback', () => {
    const linked = /** @type {HTMLElement} */ (renderWorkflowRunLink({
      'run-link': {
        href: 'https://github.com/githubnext/central-agentic-ops/actions/runs/42',
        label: 'Run 42'
      }
    }, '42'));

    expect(linked.getAttribute('href')).toBe('https://github.com/githubnext/central-agentic-ops/actions/runs/42');
    expect(linked.getAttribute('target')).toBe('_blank');
    expect(linked.getAttribute('rel')).toBe('noopener noreferrer');
    expect(linked.getAttribute('aria-label')).toBe('Run 42');
    expect(linked.textContent).toBe('42');
    expect(renderWorkflowRunLink({}, 'Unavailable')).toBe('Unavailable');
  });

  it('resolves a JSON-configured compact title link for issue and run identifiers', () => {
    const row = {
      run: '42',
      'run-link': {
        href: 'https://github.com/githubnext/central-agentic-ops/actions/runs/42',
        label: 'Run 42'
      }
    };
    expect(resolveTitleLink(row, {
      'href-field': 'run-link',
      'identifier-field': 'run'
    })).toEqual({
      href: 'https://github.com/githubnext/central-agentic-ops/actions/runs/42',
      label: '#42'
    });
    expect(resolveTitleLink(row, {
      'href-field': 'run-link',
      'identifier-field': 'missing'
    })).toBeNull();
  });

  it('renders durable-output titles as encoded dashboard links with a plain-text fallback', () => {
    const linked = /** @type {HTMLElement} */ (renderOutcomeLink({ 'safe-output': 'issue/42' }, 'Issue 42'));

    expect(linked.getAttribute('href')).toBe('#page-outcome-detail?outcome=issue%2F42');
    expect(linked.textContent).toBe('Issue 42');
    expect(renderOutcomeLink({}, 'Unavailable')).toBe('Unavailable');
  });
});
