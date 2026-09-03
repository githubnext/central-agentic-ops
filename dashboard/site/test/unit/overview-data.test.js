import { describe, expect, it } from 'vitest';
import { deriveOverviewSources } from '../../src/overview-data.js';

/** @type {import('../../src/presenter.js').SourceMetadata} */
const metadata = {
  'source-id': 'overview-fixture',
  'source-kind': 'fixture',
  'as-of': '2026-09-02T12:00:00Z',
  'retrieved-at': '2026-09-02T12:01:00Z',
  availability: 'available',
  completeness: 'complete',
  freshness: 'fresh'
};

/**
 * @param {string} name
 * @param {Array<Record<string, unknown>>} [rows]
 * @returns {import('../../src/presenter.js').LogicalSourceInput}
 */
function source(name, rows = []) {
  return { source: name, rows, metadata };
}

describe('overview attention', () => {
  it('summarizes recent package dispatch states', () => {
    const workflow = {
      organization: 'githubnext',
      repository: 'gh-aw-cao',
      package: 'daily-ops',
      'package-name': 'Daily Ops',
      workflow: '.github/workflows/daily.yml',
      'workflow-role': 'orchestrator'
    };
    /** @param {string} run @param {string} conclusion @param {string} [status] */
    const dispatch = (run, conclusion, status = 'completed') => ({
      organization: 'githubnext',
      repository: 'gh-aw-cao',
      workflow: workflow.workflow,
      event: 'workflow_dispatch',
      run,
      'run-status': status,
      'run-conclusion': conclusion
    });
    const sources = deriveOverviewSources({
      workflows: source('workflows', [workflow]),
      repositories: source('repositories'),
      runs: source('runs', [
        dispatch('1', 'success'),
        dispatch('2', 'failure'),
        dispatch('3', 'action-required'),
        dispatch('4', 'unknown', 'in-progress'),
        dispatch('5', 'cancelled')
      ]),
      usage: source('usage'),
      outcomes: source('outcomes'),
      findings: source('findings'),
      'grader-observations': source('grader-observations'),
      'operational-values': source('operational-values'),
      'coverage-diagnostics': source('coverage-diagnostics')
    });

    expect(sources['overview-managed-packages'].rows).toContainEqual(expect.objectContaining({
      package: 'daily-ops',
      'dispatch-count': 5,
      'dispatch-success-count': 1,
      'dispatch-failure-count': 1,
      'dispatch-approval-count': 1,
      'dispatch-pending-count': 1
    }));
  });

  it('promotes unavailable control policy resolution to act-now attention', () => {
    const sources = deriveOverviewSources({
      workflows: source('workflows'),
      repositories: source('repositories'),
      runs: source('runs'),
      usage: source('usage'),
      outcomes: source('outcomes'),
      findings: source('findings'),
      'grader-observations': source('grader-observations'),
      'operational-values': source('operational-values'),
      'coverage-diagnostics': source('coverage-diagnostics', [{
        title: 'Control policy resolution unavailable',
        effect: 'control-plane is required'
      }])
    });

    expect(sources['overview-attention'].rows).toContainEqual(expect.objectContaining({
      tone: 'danger',
      title: 'Control policy resolution unavailable',
      detail: 'control-plane is required'
    }));
    expect(sources['overview-attention-domains'].rows).toContainEqual(expect.objectContaining({
      state: 'Act now',
      tone: 'critical',
      domain: 'Security & controls',
      value: '1 signal',
      detail: expect.stringContaining('1 policy resolution blocks'),
      href: '#page-coverage'
    }));
  });

  it('promotes policy-blocked workflows to act-now admission attention', () => {
    const sources = deriveOverviewSources({
      workflows: source('workflows', [{
        package: 'dependabot',
        'package-name': 'Dependabot',
        workflow: '.github/workflows/dependabot-release-train-updater.md',
        'workflow-role': 'worker',
        'workflow-active': 'true',
        'admission-status': 'blocked',
        'admission-reason': 'worker-disabled'
      }]),
      repositories: source('repositories'),
      runs: source('runs'),
      usage: source('usage'),
      outcomes: source('outcomes'),
      findings: source('findings'),
      'grader-observations': source('grader-observations'),
      'operational-values': source('operational-values'),
      'coverage-diagnostics': source('coverage-diagnostics')
    });

    expect(sources['overview-attention'].rows).toContainEqual(expect.objectContaining({
      tone: 'danger',
      title: '1 workflow blocked by admission',
      detail: 'worker-disabled'
    }));
    expect(sources['overview-attention-domains'].rows).toContainEqual(expect.objectContaining({
      state: 'Act now',
      tone: 'critical',
      domain: 'Security & controls',
      value: '1 signal',
      detail: expect.stringContaining('1 admission gates'),
      href: '#page-security'
    }));
    expect(sources['security-summary'].rows).toContainEqual({ label: 'Admission gates', value: 1 });
    expect(sources['security-signals'].rows).toContainEqual(expect.objectContaining({
      tone: 'danger',
      kind: 'Admission gate',
      title: 'Dependabot',
      detail: 'worker-disabled',
      evidence: 'Checked-in control policy',
      'navigation-page': 'packages'
    }));
  });

  it('promotes GitHub API capacity admission blocks with retry guidance', () => {
    const workflow = '.github/workflows/self-care.md';
    const officialGuidance = 'https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api';
    const sources = deriveOverviewSources({
      workflows: source('workflows', [{ workflow, 'workflow-name': 'SelfCare', 'workflow-role': 'orchestrator' }]),
      repositories: source('repositories'),
      runs: source('runs', [{
        workflow,
        run: '33682053183',
        'run-conclusion': 'failure',
        'admission-status': 'resource-limited',
        'admission-reason': 'github-api-capacity-insufficient',
        resource: 'github-rest-api',
        'resource-reset-at': '2026-09-02T22:04:33.000Z',
        'resource-wait-hours': 1.08
      }]),
      usage: source('usage'),
      outcomes: source('outcomes'),
      findings: source('findings'),
      'grader-observations': source('grader-observations'),
      'operational-values': source('operational-values'),
      'coverage-diagnostics': source('coverage-diagnostics')
    });

    expect(sources['overview-attention'].rows).toContainEqual(expect.objectContaining({
      tone: 'danger',
      title: '1 run blocked by GitHub API capacity',
      detail: expect.stringContaining('approximately 1.08 hours')
    }));
    expect(sources['overview-attention'].rows).not.toContainEqual(expect.objectContaining({ title: '1 failed run' }));
    expect(sources['overview-attention-domains'].rows).toContainEqual(expect.objectContaining({
      state: 'Act now',
      domain: 'Security & controls',
      value: '1 signal',
      detail: expect.stringContaining('1 API capacity gates')
    }));
    expect(sources['security-summary'].rows).toContainEqual({ label: 'API capacity gates', value: 1 });
    expect(sources['security-signals'].rows).toContainEqual(expect.objectContaining({
      kind: 'Resource admission gate',
      title: 'SelfCare',
      detail: expect.stringContaining('2026-09-02T22:04:33.000Z'),
      action: 'Open official GitHub guidance',
      'external-link': expect.objectContaining({ href: officialGuidance })
    }));
  });
});