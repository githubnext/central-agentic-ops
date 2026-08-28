import { describe, expect, it } from 'vitest';
import { validateDashboardDocument } from '../../src/validator.js';

const validDocument = `language-version: "0.1.0"
dashboard:
  id: agentic-operations
  title: Agentic Operations
  defaults:
    scope: {}
    time: {}
    filters: {}
  pages:
    - id: overview
      kind: built-in
      page: overview
      title: Overview
    - id: custom-summary
      kind: custom
      title: Custom Summary
      views:
        - id: run-count
          data:
            source: runs
          mark: metric
          encoding:
            value:
              field: run
              aggregate: count
`;

describe('dashboard document validation', () => {
  it('DLS-DOC-002 DLS-DOC-003 DLS-DOC-004 accepts the minimal structural document shape', () => {
    const result = validateDashboardDocument(validDocument);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.languageVersion).toBe('0.1.0');
      expect(result.value.dashboard.id).toBe('agentic-operations');
      expect(result.value.dashboard.pages).toHaveLength(2);
    }
  });

  it('DLS-DOC-001 rejects multiple YAML documents with DLS-E002', () => {
    const result = validateDashboardDocument(`${validDocument}\n---\n${validDocument}`);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual([
        expect.objectContaining({ code: 'DLS-E002', path: '$' })
      ]);
    }
  });

  it('DLS-DOC-001 DLS-SAFE-001 rejects invalid YAML syntax with DLS-E001', () => {
    const result = validateDashboardDocument('language-version: "0.1.0"\ndashboard: [unterminated');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual([
        expect.objectContaining({ code: 'DLS-E001', path: '$' })
      ]);
    }
  });

  it('DLS-DOC-002 DLS-DOC-007 rejects unknown and duplicate root keys with DLS-E004', () => {
    const result = validateDashboardDocument(`language-version: "0.1.0"
extra-root: true
dashboard:
  id: agentic-operations
  title: Agentic Operations
  pages:
    - id: overview
      kind: built-in
      page: overview
dashboard:
  id: duplicate-dashboard
  title: Duplicate
  pages:
    - id: repositories
      kind: built-in
      page: repositories
`);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'DLS-E004', path: '$.extra-root' }),
          expect.objectContaining({ code: 'DLS-E004', path: '$.dashboard' })
        ])
      );
    }
  });

  it('DLS-DOC-003 DLS-DOC-006 rejects non-canonical language-version with DLS-E005', () => {
    const result = validateDashboardDocument(validDocument.replace('"0.1.0"', '"0.1"'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual([
        expect.objectContaining({ code: 'DLS-E005', path: '$.language-version' })
      ]);
    }
  });

  it('DLS-DOC-004 DLS-DOC-010 rejects missing title and empty pages with DLS-E003', () => {
    const result = validateDashboardDocument(`language-version: "0.1.0"
dashboard:
  id: agentic-operations
  pages: []
`);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'DLS-E003', path: '$.dashboard.title' }),
          expect.objectContaining({ code: 'DLS-E003', path: '$.dashboard.pages' })
        ])
      );
    }
  });

  it('DLS-DOC-005 rejects non-canonical dashboard page and view identifiers with DLS-E005', () => {
    const result = validateDashboardDocument(`language-version: "0.1.0"
dashboard:
  id: Agentic_Operations
  title: Agentic Operations
  pages:
    - id: Runs_Page
      kind: custom
      views:
        - id: RunCount
`);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'DLS-E005', path: '$.dashboard.id' }),
          expect.objectContaining({ code: 'DLS-E005', path: '$.dashboard.pages[0].id' }),
          expect.objectContaining({ code: 'DLS-E005', path: '$.dashboard.pages[0].views[0].id' })
        ])
      );
    }
  });

  it('DLS-DOC-005 rejects duplicate page ids and duplicate view ids with DLS-E003', () => {
    const result = validateDashboardDocument(`language-version: "0.1.0"
dashboard:
  id: agentic-operations
  title: Agentic Operations
  pages:
    - id: duplicate
      kind: built-in
      page: overview
    - id: duplicate
      kind: custom
      views:
        - id: duplicate-view
        - id: duplicate-view
`);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'DLS-E003', path: '$.dashboard.pages[1].id' }),
          expect.objectContaining({ code: 'DLS-E003', path: '$.dashboard.pages[1].views[1].id' })
        ])
      );
    }
  });

  it('DLS-DOC-008 rejects unknown defaults keys with DLS-E004', () => {
    const result = validateDashboardDocument(`language-version: "0.1.0"
dashboard:
  id: agentic-operations
  title: Agentic Operations
  defaults:
    scope: {}
    timezone: UTC
  pages:
    - id: overview
      kind: built-in
      page: overview
`);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual([
        expect.objectContaining({ code: 'DLS-E004', path: '$.dashboard.defaults.timezone' })
      ]);
    }
  });

  it('DLS-DOC-009 rejects invalid page kinds and built-in page names with DLS-E005', () => {
    const result = validateDashboardDocument(`language-version: "0.1.0"
dashboard:
  id: agentic-operations
  title: Agentic Operations
  pages:
    - id: overview
      kind: builtin
      page: overview
    - id: runs
      kind: built-in
      page: invalid-page
`);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'DLS-E005', path: '$.dashboard.pages[0].kind' }),
          expect.objectContaining({ code: 'DLS-E005', path: '$.dashboard.pages[1].page' })
        ])
      );
    }
  });

  it('DLS-VAL-001 reports code message and YAML path for each detected error', () => {
    const result = validateDashboardDocument(`language-version: "0.1"
dashboard:
  id: invalid_dashboard
  title: 42
  defaults: []
  pages: []
`);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      for (const error of result.errors) {
        expect(error.code).toMatch(/^DLS-E\d{3}$/);
        expect(error.message.length).toBeGreaterThan(0);
        expect(error.path.startsWith('$')).toBe(true);
      }
    }
  });
});
