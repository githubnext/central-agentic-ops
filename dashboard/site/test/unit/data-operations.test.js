import { describe, expect, it } from 'vitest';
import { tidy } from '../../src/data-operations.js';
import { processDataRequest } from '../../src/data-worker.js';

describe('dashboard data operations', () => {
  const rows = [
    { repository: 'bravo', status: 'open', score: 2 },
    { repository: 'alpha', status: 'closed', score: 4 },
    { repository: 'charlie', status: 'open', score: 6 }
  ];

  it('filters and arranges rows using serializable operators', () => {
    expect(tidy(rows, [
      { op: 'filter', predicates: [{ field: 'status', equals: 'open' }] },
      { op: 'arrange', by: [{ field: 'repository', direction: 'asc' }] }
    ])).toEqual([
      { repository: 'bravo', status: 'open', score: 2 },
      { repository: 'charlie', status: 'open', score: 6 }
    ]);
  });

  it('summarizes groups and computes means without mutating its input', () => {
    expect(tidy(rows, [{
      op: 'summarize',
      by: ['status'],
      values: [
        { field: 'repository', as: 'repositories', reducer: 'count' },
        { field: 'score', as: 'mean-score', reducer: 'mean' }
      ]
    }])).toEqual([
      { status: 'open', repositories: 2, 'mean-score': 4 },
      { status: 'closed', repositories: 1, 'mean-score': 4 }
    ]);
    expect(rows.map((row) => row.repository)).toEqual(['bravo', 'alpha', 'charlie']);
  });

  it('supports text search, alternatives, limits, and the worker request shape', () => {
    expect(processDataRequest({
      data: rows,
      operators: [
        {
          op: 'filter',
          search: { fields: ['repository'], query: 'a' },
          predicates: [{ field: 'status', in: ['open', 'unknown'] }]
        },
        { op: 'arrange', by: [{ field: 'score', direction: 'desc' }] },
        { op: 'slice', limit: 1 }
      ]
    })).toEqual([{ repository: 'charlie', status: 'open', score: 6 }]);
  });

  it('rejects malformed worker requests', () => {
    expect(() => processDataRequest({ data: rows, operators: null })).toThrow(
      'Data worker requests require data and operators arrays.'
    );
  });
});
