// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderLinkedText, createEntityAwareCellRenderer } from '../../src/components/linked-text.js';

describe('linked text helpers', () => {
  it('renders plain text when no safe link is available and an anchor when a safe link exists', () => {
    expect(renderLinkedText('central-agentic-ops', null)).toBe('central-agentic-ops');

    const linked = /** @type {HTMLElement} */ (renderLinkedText('central-agentic-ops', {
      href: 'https://github.com/githubnext/gh-aw-cao',
      label: 'View githubnext/gh-aw-cao on GitHub'
    }));

    expect(linked).toBeInstanceOf(HTMLElement);
    expect(linked.getAttribute('href')).toBe('https://github.com/githubnext/gh-aw-cao');
    expect(linked.getAttribute('target')).toBe('_blank');
    expect(linked.getAttribute('rel')).toBe('noopener noreferrer');
    expect(linked.getAttribute('aria-label')).toBe('View githubnext/gh-aw-cao on GitHub');
    expect(linked.textContent).toBe('central-agentic-ops');
  });

  it('renders entity-aware linked table values only for mapped entity fields with safe links', () => {
    const renderEntityAwareCellValue = createEntityAwareCellRenderer(
      { organization: 'organization-link', repository: 'repository-link' },
      (row, field) => /** @type {{ href: string, label: string } | null} */ (row[field] ?? null),
      (display, value) => `${String(display ?? 'text')}:${String(value)}`,
      (value) => value == null ? 'unknown' : String(value)
    );

    const linkedRepository = /** @type {HTMLElement} */ (renderEntityAwareCellValue('repository', 'central-agentic-ops', {
      'repository-link': {
        href: 'https://github.com/githubnext/gh-aw-cao',
        label: 'View githubnext/gh-aw-cao on GitHub'
      }
    }));
    const plainStatus = renderEntityAwareCellValue('run-status', 'completed', {
      'repository-link': {
        href: 'https://github.com/githubnext/gh-aw-cao',
        label: 'View githubnext/gh-aw-cao on GitHub'
      }
    });
    const plainRepository = renderEntityAwareCellValue('repository', 'central-agentic-ops', {});

    expect(linkedRepository).toBeInstanceOf(HTMLElement);
    expect(linkedRepository.textContent).toBe('central-agentic-ops');
    expect(linkedRepository.getAttribute('href')).toBe('https://github.com/githubnext/gh-aw-cao');
    expect(plainStatus).toBe('text:completed');
    expect(plainRepository).toBe('text:central-agentic-ops');
  });
});
