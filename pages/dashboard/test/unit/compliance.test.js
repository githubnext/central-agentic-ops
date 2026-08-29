import { describe, expect, it } from 'vitest';
import {
  IMPLEMENTATION_VERSION,
  appendixAFixture,
  appendixCFixtures,
  runComplianceSmokeSuite
} from '../../src/compliance.js';
import { validateDashboardDocument } from '../../src/validator.js';

describe('compliance suite', () => {
  it('DLS-TEST-001 DLS-TEST-002 records machine-readable compliance results with test and requirement identifiers', () => {
    const results = runComplianceSmokeSuite();

    expect(results.length).toBeGreaterThan(0);
    expect(results).toEqual(expect.arrayContaining([
      expect.objectContaining({
        implementationVersion: IMPLEMENTATION_VERSION,
        testId: expect.any(String),
        requirementId: expect.any(String),
        status: expect.stringMatching(/pass|fail/)
      })
    ]));
    for (const result of results) {
      expect(result).toHaveProperty('failureEvidence');
    }
  });

  it('DLS-TEST-003 includes exact time boundaries and distinct empty unavailable partial stale and unknown data states in compliance fixtures', () => {
    const results = runComplianceSmokeSuite();
    const testResult = results.find((result) => result.testId === 'T-TEST-001' && result.requirementId === 'DLS-TEST-003');

    expect(testResult).toEqual(expect.objectContaining({ status: 'pass' }));
  });

  it('T-DOC-001 Appendix A validates as a passing compliance fixture', () => {
    const result = validateDashboardDocument(appendixAFixture);

    expect(result.ok).toBe(true);
  });

  it.each(Object.entries(appendixCFixtures))('T-VAL-001 Appendix C fixture %s rejects with the documented error code', (_name, fixture) => {
    const result = validateDashboardDocument(fixture.yaml);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: fixture.expectedCode })
        ])
      );
    }
  });
});
