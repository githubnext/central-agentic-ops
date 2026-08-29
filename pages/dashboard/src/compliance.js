/**
 * Compliance fixtures and machine-readable conformance helpers for the dashboard validator and presenter.
 */

import { validateDashboardDocument } from './validator.js';
import { renderDashboard } from './presenter.js';

export const IMPLEMENTATION_VERSION = '0.1.0-prototype';

/** @typedef {'pass'|'fail'} ComplianceStatus */
/** @typedef {{ testId: string, requirementId: string, implementationVersion: string, status: ComplianceStatus, failureEvidence: string | null }} ComplianceResult */

export const appendixAFixture = `language-version: "0.1.0"
dashboard:
  id: agentic-operations
  title: Agentic Operations
  description: Workflow activity, usage, findings, and operational value.
  defaults:
    scope:
      organizations:
        - octo-org
    time:
      range: 30d
    filters:
      rollout-mode:
        - review
        - live
  pages:
    - id: overview
      kind: built-in
      page: overview
      title: Overview
      definition:
        data-state:
          availability: true
          completeness: true
          freshness: true
        views:
          - id: workflow-overview
            data:
              source: workflows
            mark: table
            encoding:
              columns:
                - field: workflow-active
                - field: rollout-mode
          - id: run-overview
            data:
              source: runs
            mark: table
            encoding:
              columns:
                - field: run-status
                - field: run-conclusion
                - field: repository
                - field: workflow
          - id: usage-overview
            data:
              source: usage
            mark: metric
            encoding:
              value:
                field: aic
                type: quantitative
                aggregate: sum
          - id: findings-overview
            data:
              source: findings
            mark: table
            encoding:
              columns:
                - field: finding-summary
                - field: observed-at
                - field: issue-link
                - field: pull-request-link
                - field: run-link
          - id: value-overview
            data:
              source: operational-values
            mark: table
            encoding:
              columns:
                - field: operational-value
                - field: operational-value-definition
                - field: observed-at
    - id: workflows
      kind: built-in
      page: workflows
      title: Workflows
      definition:
        data-state:
          availability: true
          completeness: true
          freshness: true
        views:
          - id: workflow-inventory
            data:
              source: workflows
            mark: table
            encoding:
              columns:
                - field: workflow
                - field: workflow-active
                - field: rollout-mode
          - id: workflow-runs
            data:
              source: runs
            mark: table
            encoding:
              columns:
                - field: run
                - field: run-conclusion
          - id: workflow-outcomes
            data:
              source: outcomes
            mark: table
            encoding:
              columns:
                - field: outcome-state
          - id: workflow-usage
            data:
              source: usage
            mark: metric
            encoding:
              value:
                field: aic
                type: quantitative
                aggregate: sum
          - id: workflow-findings
            data:
              source: findings
            mark: metric
            encoding:
              value:
                field: finding
                type: quantitative
                aggregate: count
          - id: workflow-value
            data:
              source: operational-values
            mark: table
            encoding:
              columns:
                - field: operational-value
    - id: usage-by-repository
      kind: custom
      title: Usage by Repository
      views:
        - id: total-aic
          title: Total AI Credits
          data:
            source: usage
          mark: metric
          encoding:
            value:
              field: aic
              type: quantitative
              aggregate: sum
        - id: daily-runs
          title: Daily Runs
          data:
            source: runs
          mark: chart
          encoding:
            x:
              field: started-at
              type: temporal
              time-unit: day
            y:
              field: run
              type: quantitative
              aggregate: count
            color:
              field: rollout-mode
              type: nominal
        - id: largest-spenders
          title: Largest AIC Spenders
          data:
            source: usage
            limit: 10
            order-by:
              - field: sum-aic
                direction: desc
          mark: table
          encoding:
            columns:
              - field: repository
                type: nominal
              - field: aic
                type: quantitative
                aggregate: sum
                as: sum-aic
`;

export const appendixCFixtures = {
  multipleDocuments: {
    requirementId: 'DLS-DOC-001',
    yaml: `language-version: "0.1.0"
dashboard: {}
---
language-version: "0.1.0"
dashboard: {}
`,
    expectedCode: 'DLS-E002'
  },
  nonCanonicalId: {
    requirementId: 'DLS-DOC-005',
    yaml: `language-version: "0.1.0"
dashboard:
  id: Agentic_Operations
  title: Agentic Operations
  pages: []
`,
    expectedCode: 'DLS-E005'
  },
  forbiddenJoinAndExpression: {
    requirementId: 'DLS-DOC-007',
    yaml: `language-version: "0.1.0"
dashboard:
  id: combined-usage
  title: Combined Usage
  pages:
    - id: combined-usage
      kind: custom
      views:
        - id: calculated-cost
          data:
            source: usage
          join: runs
          mark: metric
          encoding:
            value:
              expression: raw-token-count * rate
`,
    expectedCode: 'DLS-E004'
  },
  incompatibleMeasure: {
    requirementId: 'DLS-AGG-005',
    yaml: `language-version: "0.1.0"
dashboard:
  id: summed-value
  title: Summed Value
  pages:
    - id: value-page
      kind: custom
      title: Value
      views:
        - id: value-total
          data:
            source: operational-values
          mark: metric
          encoding:
            value:
              field: operational-value
              aggregate: sum
`,
    expectedCode: 'DLS-E010'
  }
};

/**
 * @returns {ComplianceResult[]}
 */
export function runComplianceSmokeSuite() {
  /** @type {ComplianceResult[]} */
  const results = [];

  const appendixAValidation = validateDashboardDocument(appendixAFixture);
  results.push(createResult(
    'T-DOC-001',
    'DLS-DOC-001',
    appendixAValidation.ok,
    appendixAValidation.ok ? null : summarizeErrors(appendixAValidation.errors)
  ));
  results.push(createResult(
    'T-PAGE-001',
    'DLS-PAGE-001',
    appendixAValidation.ok,
    appendixAValidation.ok ? null : summarizeErrors(appendixAValidation.errors)
  ));
  results.push(createResult(
    'T-TEST-001',
    'DLS-TEST-003',
    fixtureIncludesExactTimeAndMissingDataCoverage(),
    fixtureIncludesExactTimeAndMissingDataCoverage() ? null : 'Appendix A fixture metadata did not include exact time and explicit missing-data distinctions.'
  ));

  for (const fixture of Object.values(appendixCFixtures)) {
    const result = validateDashboardDocument(fixture.yaml);
    const hasExpectedCode = !result.ok && result.errors.some((error) => error.code === fixture.expectedCode);
    results.push(createResult(
      'T-VAL-001',
      fixture.requirementId,
      hasExpectedCode,
      hasExpectedCode ? null : summarizeErrors(result.ok ? [] : result.errors)
    ));
  }

  if (appendixAValidation.ok) {
    const element = renderDashboard({
      document: appendixAValidation.value,
      sources: createAppendixASources()
    });
    const summaryText = element.textContent || '';
    const exposesDataState = summaryText.includes('Availability') && summaryText.includes('Completeness') && summaryText.includes('Freshness');
    results.push(createResult(
      'T-DATA-001',
      'DLS-DATA-003',
      exposesDataState,
      exposesDataState ? null : 'Rendered Appendix A fixture did not expose page or view source metadata and data-state text.'
    ));
  } else {
    results.push(createResult(
      'T-DATA-001',
      'DLS-DATA-003',
      false,
      summarizeErrors(appendixAValidation.errors)
    ));
  }

  return results;
}

/**
 * @param {string} testId
 * @param {string} requirementId
 * @param {boolean} passed
 * @param {string | null} failureEvidence
 * @returns {ComplianceResult}
 */
function createResult(testId, requirementId, passed, failureEvidence) {
  return {
    testId,
    requirementId,
    implementationVersion: IMPLEMENTATION_VERSION,
    status: passed ? 'pass' : 'fail',
    failureEvidence: passed ? null : failureEvidence || 'No failure evidence recorded.'
  };
}

/**
 * @param {Array<{ code: string, path: string, message: string }>} errors
 * @returns {string}
 */
function summarizeErrors(errors) {
  if (errors.length === 0) {
    return 'Expected a validation failure but no coded errors were produced.';
  }
  return errors.map((error) => `${error.code} at ${error.path}: ${error.message}`).join('; ');
}

/**
 * @returns {boolean}
 */
function fixtureIncludesExactTimeAndMissingDataCoverage() {
  const sources = createAppendixASources();
  return Object.values(sources).every((source) => (
    typeof source.metadata['as-of'] === 'string'
    && typeof source.metadata['retrieved-at'] === 'string'
    && typeof source.metadata.availability === 'string'
    && typeof source.metadata.completeness === 'string'
    && typeof source.metadata.freshness === 'string'
  ));
}

/**
 * @returns {Record<string, import('./presenter.js').LogicalSourceInput>}
 */
function createAppendixASources() {
  return {
    workflows: {
      source: 'workflows',
      metadata: {
        'source-id': 'workflows-source',
        'source-kind': 'fixture',
        'as-of': '2026-08-29T12:00:00Z',
        'retrieved-at': '2026-08-29T12:05:00Z',
        availability: 'available',
        completeness: 'complete',
        freshness: 'fresh'
      },
      rows: [
        {
          organization: 'octo-org',
          repository: 'octo-org/platform',
          workflow: '.github/workflows/ci.yml',
          'workflow-active': 'true',
          'rollout-mode': 'review',
          'observed-at': '2026-08-29T11:00:00Z'
        }
      ]
    },
    runs: {
      source: 'runs',
      metadata: {
        'source-id': 'runs-source',
        'source-kind': 'fixture',
        'as-of': '2026-08-29T12:00:00Z',
        'retrieved-at': '2026-08-29T12:05:00Z',
        availability: 'available',
        completeness: 'partial',
        freshness: 'stale'
      },
      rows: [
        {
          organization: 'octo-org',
          repository: 'octo-org/platform',
          workflow: '.github/workflows/ci.yml',
          run: '1001',
          'run-status': 'completed',
          'run-conclusion': 'success',
          'rollout-mode': 'review',
          engine: 'github-models',
          'requested-model': 'gpt-4.1',
          'resolved-model': 'gpt-4.1-mini',
          'started-at': '2026-08-29T10:00:00Z'
        }
      ]
    },
    usage: {
      source: 'usage',
      metadata: {
        'source-id': 'usage-source',
        'source-kind': 'fixture',
        'as-of': '2026-08-29T12:00:00Z',
        'retrieved-at': '2026-08-29T12:05:00Z',
        availability: 'empty',
        completeness: 'unknown',
        freshness: 'fresh'
      },
      rows: []
    },
    outcomes: {
      source: 'outcomes',
      metadata: {
        'source-id': 'outcomes-source',
        'source-kind': 'fixture',
        'as-of': '2026-08-29T12:00:00Z',
        'retrieved-at': '2026-08-29T12:05:00Z',
        availability: 'available',
        completeness: 'complete',
        freshness: 'fresh'
      },
      rows: [
        {
          run: '1001',
          'outcome-state': 'accepted'
        }
      ]
    },
    findings: {
      source: 'findings',
      metadata: {
        'source-id': 'findings-source',
        'source-kind': 'fixture',
        'as-of': '2026-08-29T12:00:00Z',
        'retrieved-at': '2026-08-29T12:05:00Z',
        availability: 'available',
        completeness: 'complete',
        freshness: 'fresh'
      },
      rows: [
        {
          organization: 'octo-org',
          repository: 'octo-org/platform',
          workflow: '.github/workflows/ci.yml',
          run: '1001',
          finding: 'finding-1',
          'finding-summary': 'Pull request needed manual review',
          'finding-severity': 'medium',
          'finding-status': 'open',
          'observed-at': '2026-08-29T11:30:00Z',
          'pull-request-link': {
            relation: 'pull-request',
            href: 'https://github.com/octo-org/platform/pull/12',
            label: 'PR #12'
          },
          'run-link': {
            relation: 'run',
            href: 'https://github.com/octo-org/platform/actions/runs/1001',
            label: 'Run 1001'
          }
        }
      ]
    },
    'operational-values': {
      source: 'operational-values',
      metadata: {
        'source-id': 'value-source',
        'source-kind': 'fixture',
        'as-of': '2026-08-29T12:00:00Z',
        'retrieved-at': '2026-08-29T12:05:00Z',
        availability: 'unavailable',
        completeness: 'unknown',
        freshness: 'unknown'
      },
      rows: []
    }
  };
}
