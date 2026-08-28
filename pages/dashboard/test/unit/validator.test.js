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

  it('DLS-SEM-017 accepts every canonical Section 5.1 source name', () => {
    const result = validateDashboardDocument(`language-version: "0.1.0"
dashboard:
  id: source-catalog
  title: Source Catalog
  pages:
    - id: all-sources
      kind: custom
      views:
        - id: organizations-view
          data:
            source: organizations
          mark: metric
          encoding:
            value:
              field: organization
              aggregate: count
        - id: repositories-view
          data:
            source: repositories
          mark: metric
          encoding:
            value:
              field: repository
              aggregate: count
        - id: workflows-view
          data:
            source: workflows
          mark: metric
          encoding:
            value:
              field: workflow
              aggregate: count
        - id: runs-view
          data:
            source: runs
          mark: metric
          encoding:
            value:
              field: run
              aggregate: count
        - id: experiments-view
          data:
            source: experiments
          mark: metric
          encoding:
            value:
              field: experiment
              aggregate: count
        - id: experiment-assignments-view
          data:
            source: experiment-assignments
          mark: metric
          encoding:
            value:
              field: run
              aggregate: count
        - id: graders-view
          data:
            source: graders
          mark: metric
          encoding:
            value:
              field: grader
              aggregate: count
        - id: grader-observations-view
          data:
            source: grader-observations
          mark: metric
          encoding:
            value:
              field: grader
              aggregate: count
        - id: evals-view
          data:
            source: evals
          mark: metric
          encoding:
            value:
              field: eval
              aggregate: count
        - id: eval-observations-view
          data:
            source: eval-observations
          mark: metric
          encoding:
            value:
              field: eval
              aggregate: count
        - id: usage-view
          data:
            source: usage
          mark: metric
          encoding:
            value:
              field: aic
              aggregate: sum
        - id: outcomes-view
          data:
            source: outcomes
          mark: metric
          encoding:
            value:
              field: safe-output
              aggregate: count
        - id: findings-view
          data:
            source: findings
          mark: metric
          encoding:
            value:
              field: finding
              aggregate: count
        - id: operational-values-view
          data:
            source: operational-values
          mark: metric
          encoding:
            value:
              field: operational-value
              aggregate: max
`);

    expect(result.ok).toBe(true);
  });

  it('DLS-SEM-017 rejects unknown source names with DLS-E005', () => {
    const result = validateDashboardDocument(`language-version: "0.1.0"
dashboard:
  id: invalid-source
  title: Invalid Source
  pages:
    - id: custom-page
      kind: custom
      views:
        - id: invalid-view
          data:
            source: deployments
          mark: metric
          encoding:
            value:
              field: repository
              aggregate: count
`);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual([
        expect.objectContaining({ code: 'DLS-E005', path: '$.dashboard.pages[0].views[0].data.source' })
      ]);
    }
  });

  it('DLS-SEM-021 accepts rollout-mode canonical values and rejects non-canonical spellings', () => {
    const accepted = validateDashboardDocument(`language-version: "0.1.0"
dashboard:
  id: rollout-mode-filter
  title: Rollout Mode Filter
  pages:
    - id: custom-page
      kind: custom
      views:
        - id: usage-view
          data:
            source: usage
            filters:
              rollout-mode:
                - review
                - live
                - unknown
          mark: metric
          encoding:
            value:
              field: aic
              aggregate: sum
`);

    expect(accepted.ok).toBe(true);

    const rejected = validateDashboardDocument(`language-version: "0.1.0"
dashboard:
  id: invalid-rollout-mode
  title: Invalid Rollout Mode
  pages:
    - id: custom-page
      kind: custom
      views:
        - id: usage-view
          data:
            source: usage
            filters:
              rollout-mode:
                - review
                - in_review
          mark: metric
          encoding:
            value:
              field: aic
              aggregate: sum
`);

    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(rejected.errors).toEqual([
        expect.objectContaining({ code: 'DLS-E005', path: '$.dashboard.pages[0].views[0].data.filters.rollout-mode[1]' })
      ]);
    }
  });

  it('DLS-CTX-009 DLS-CTX-002 accepts valid scope and time context shapes', () => {
    const result = validateDashboardDocument(`language-version: "0.1.0"
dashboard:
  id: context-shapes
  title: Context Shapes
  defaults:
    scope:
      organizations:
        - octo-org
      repositories:
        - octo-org/central-agentic-ops
    time:
      start: "2026-08-01T00:00:00Z"
      end: "2026-08-31T00:00:00Z"
    filters:
      rollout-mode:
        - review
        - live
  pages:
    - id: custom-page
      kind: custom
      views:
        - id: usage-view
          data:
            source: usage
            scope:
              workflows:
                - .github/workflows/dashboard.yml
            time:
              range: 7d
            filters:
              repository: octo-org/central-agentic-ops
          mark: metric
          encoding:
            value:
              field: aic
              aggregate: sum
`);

    expect(result.ok).toBe(true);
  });

  it('DLS-CTX-009 rejects invalid time.range forms and mixing range with start/end using DLS-E010', () => {
    const result = validateDashboardDocument(`language-version: "0.1.0"
dashboard:
  id: invalid-range
  title: Invalid Range
  pages:
    - id: custom-page
      kind: custom
      views:
        - id: bad-range
          data:
            source: runs
            time:
              range: 0d
              start: "2026-08-01T00:00:00Z"
          mark: metric
          encoding:
            value:
              field: run
              aggregate: count
`);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'DLS-E010', path: '$.dashboard.pages[0].views[0].data.time.range' }),
          expect.objectContaining({ code: 'DLS-E010', path: '$.dashboard.pages[0].views[0].data.time' })
        ])
      );
    }
  });

  it('DLS-CTX-002 rejects non-RFC-3339 timestamps with DLS-E010', () => {
    const result = validateDashboardDocument(`language-version: "0.1.0"
dashboard:
  id: invalid-time-format
  title: Invalid Time Format
  pages:
    - id: custom-page
      kind: custom
      views:
        - id: bad-time
          data:
            source: runs
            time:
              start: 2026-08-01
              end: "2026-08-02T00:00:00Z"
          mark: metric
          encoding:
            value:
              field: run
              aggregate: count
`);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual([
        expect.objectContaining({ code: 'DLS-E010', path: '$.dashboard.pages[0].views[0].data.time.start' })
      ]);
    }
  });

  it('DLS-CTX-002 rejects non-increasing start/end bounds with DLS-E010', () => {
    const result = validateDashboardDocument(`language-version: "0.1.0"
dashboard:
  id: invalid-time-order
  title: Invalid Time Order
  pages:
    - id: custom-page
      kind: custom
      views:
        - id: bad-time-order
          data:
            source: runs
            time:
              start: "2026-08-02T00:00:00Z"
              end: "2026-08-01T00:00:00Z"
          mark: metric
          encoding:
            value:
              field: run
              aggregate: count
`);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual([
        expect.objectContaining({ code: 'DLS-E010', path: '$.dashboard.pages[0].views[0].data.time' })
      ]);
    }
  });

  it('DLS-CTX-004 rejects invalid scope, filter, limit, and order-by shapes using DLS-E010', () => {
    const result = validateDashboardDocument(`language-version: "0.1.0"
dashboard:
  id: invalid-context
  title: Invalid Context
  defaults:
    scope:
      organizations: []
    filters:
      rollout-mode: []
  pages:
    - id: custom-page
      kind: custom
      views:
        - id: bad-context
          data:
            source: usage
            scope:
              invalid-scope:
                - octo-org
            filters:
              repository:
                - octo-org/central-agentic-ops
                - ""
            limit: 0
            order-by:
              - field: repository
                direction: descending
          mark: metric
          encoding:
            value:
              field: aic
              aggregate: sum
`);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'DLS-E010', path: '$.dashboard.defaults.scope.organizations' }),
          expect.objectContaining({ code: 'DLS-E010', path: '$.dashboard.defaults.filters.rollout-mode' }),
          expect.objectContaining({ code: 'DLS-E004', path: '$.dashboard.pages[0].views[0].data.scope.invalid-scope' }),
          expect.objectContaining({ code: 'DLS-E010', path: '$.dashboard.pages[0].views[0].data.filters.repository[1]' }),
          expect.objectContaining({ code: 'DLS-E010', path: '$.dashboard.pages[0].views[0].data.limit' }),
          expect.objectContaining({ code: 'DLS-E010', path: '$.dashboard.pages[0].views[0].data.order-by[0].direction' })
        ])
      );
    }
  });

  it('DLS-CTX-004 DLS-CTX-006 accepts canonical filter dimensions for scalar and sequence values', () => {
    const result = validateDashboardDocument(`language-version: "0.1.0"
dashboard:
  id: valid-filters
  title: Valid Filters
  pages:
    - id: custom-page
      kind: custom
      views:
        - id: findings-view
          data:
            source: findings
            filters:
              finding-status:
                - open
                - unknown
              finding-severity: critical
              rollout-mode: review
          mark: metric
          encoding:
            value:
              field: finding
              aggregate: count
`);

    expect(result.ok).toBe(true);
  });

  it('DLS-SEM-004 DLS-SEM-005 DLS-SEM-006 DLS-SEM-008 DLS-SEM-009 DLS-SEM-015 reject non-canonical intrinsic enumerations in filters', () => {
    const result = validateDashboardDocument(`language-version: "0.1.0"
dashboard:
  id: invalid-intrinsic-enums
  title: Invalid Intrinsic Enums
  pages:
    - id: custom-page
      kind: custom
      views:
        - id: invalid-filters
          data:
            source: runs
            filters:
              workflow-active: maybe
              run-status: in_progress
              run-conclusion: action_required
              status: passed
              eval-result: yes
              outcome-state: lifecycle_close
          mark: metric
          encoding:
            value:
              field: run
              aggregate: count
`);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'DLS-E005', path: '$.dashboard.pages[0].views[0].data.filters.workflow-active' }),
          expect.objectContaining({ code: 'DLS-E005', path: '$.dashboard.pages[0].views[0].data.filters.run-status' }),
          expect.objectContaining({ code: 'DLS-E005', path: '$.dashboard.pages[0].views[0].data.filters.run-conclusion' }),
          expect.objectContaining({ code: 'DLS-E005', path: '$.dashboard.pages[0].views[0].data.filters.status' }),
          expect.objectContaining({ code: 'DLS-E005', path: '$.dashboard.pages[0].views[0].data.filters.eval-result' }),
          expect.objectContaining({ code: 'DLS-E005', path: '$.dashboard.pages[0].views[0].data.filters.outcome-state' })
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
