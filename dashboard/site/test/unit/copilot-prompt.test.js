import { describe, expect, it, vi } from 'vitest';
import { renderCopilotPrompt } from '../../src/copilot-prompt.js';

describe('Copilot dashboard prompt', () => {
  it('renders with the shared DOM helper and submits the active view', async () => {
    document.body.innerHTML = '<a data-nav-page-id="overview" aria-current="page" aria-label="Overview"></a>';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    const prompt = renderCopilotPrompt('/copilot');
    document.body.prepend(prompt);
    const input = prompt.querySelector('input');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected prompt input');
    input.value = 'Add a trend';

    prompt.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());

    expect(prompt.querySelector('label')?.textContent).toBe('Ask Copilot to update this view');
    const options = fetchMock.mock.calls[0]?.[1];
    if (!options || typeof options.body !== 'string') throw new Error('Expected JSON request body');
    expect(JSON.parse(options.body)).toEqual({
      view: 'Overview',
      request: 'Add a trend'
    });
    fetchMock.mockRestore();
  });
});
