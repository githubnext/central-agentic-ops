import { afterEach, describe, expect, it, vi } from 'vitest';
import { logDashboardEvent, summarizeSources } from '../../src/diagnostics.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('dashboard diagnostics', () => {
  it('emits agent-readable GitHub log macros with safe operational counts', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});

    logDashboardEvent('info', 'source.ready', {
      sourceCount: 3,
      rowCount: 12,
      state: 'ready',
    });

    expect(info).toHaveBeenCalledWith(
      '::notice title=Central Agentic Ops dashboard::source.ready {"sourceCount":3,"rowCount":12,"state":"ready"}'
    );
  });

  it('does not emit source values, URLs, error messages, or secret-shaped fields', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});

    logDashboardEvent('warning', 'source.fallback', {
      cache: 'hit',
      token: 'secret-value',
      url: 'https://example.test/?token=secret-value',
      message: 'secret-value',
      repository: 'private-owner/private-repository',
    });

    expect(warning).toHaveBeenCalledWith(
      '::warning title=Central Agentic Ops dashboard::source.fallback {"cache":"hit"}'
    );
  });

  it('replaces unknown event names instead of logging caller-provided text', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    logDashboardEvent('error', 'secret-value');

    expect(error).toHaveBeenCalledWith(
      '::error title=Central Agentic Ops dashboard::dashboard.event'
    );
  });

  it('summarizes logical sources without exposing their contents', () => {
    expect(summarizeSources({
      workflows: { rows: [{ token: 'secret-value' }, { token: 'another-secret' }] },
      runs: { rows: [{}] },
      unavailable: null,
    })).toEqual({ sourceCount: 3, rowCount: 3 });
  });
});
