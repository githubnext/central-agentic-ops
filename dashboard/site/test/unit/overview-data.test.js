import { describe, expect, it } from 'vitest';
import { deriveOverviewSources } from '../../src/overview-data.js';

const metadata = {
  availability: 'available',
  completeness: 'complete',
  freshness: 'fresh'
};

function source(name, rows = []) {
  return { source: name, rows, metadata };
}

describe('overview attention', () => {
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
});