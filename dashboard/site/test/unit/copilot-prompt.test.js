import { describe, expect, it, vi } from 'vitest';
import { renderCopilotPrompt } from '../../src/copilot-prompt.js';

class MockSocket extends EventTarget {
  readyState = 1;
  /** @type {Array<Record<string, unknown>>} */
  sent = [];

  /** @param {string} message */
  send(message) {
    this.sent.push(JSON.parse(message));
  }

  /** @param {Record<string, unknown>} message */
  emit(message) {
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(message) }));
  }
}

describe('Copilot dashboard prompt', () => {
  it('opens a chat dialog and renders the streamed Copilot response', async () => {
    document.body.innerHTML = '<a data-nav-page-id="overview" aria-current="page" aria-label="Overview"></a>';
    const debugMock = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const socket = new MockSocket();
    const prompt = renderCopilotPrompt(/** @type {WebSocket} */ (/** @type {unknown} */ (socket)));
    document.body.prepend(prompt);
    const input = prompt.querySelector('input');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected prompt input');
    input.value = 'Add a trend';

    prompt.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    socket.emit({ type: 'debug', message: 'Starting dashboard view update.', details: { view: 'Overview' } });
    socket.emit({ type: 'assistant-delta', content: 'Adding ' });
    socket.emit({ type: 'assistant-delta', content: 'a trend.' });
    socket.emit({ type: 'assistant-message', content: 'Added a trend.' });
    socket.emit({ type: 'done' });

    expect(prompt.querySelector('label')?.textContent).toBe('Ask Copilot to update this view');
    expect(prompt.querySelector('dialog')?.hasAttribute('open')).toBe(true);
    expect(prompt.querySelector('.dashboard-copilot-message-user')?.textContent).toContain('Add a trend');
    expect(prompt.querySelector('.dashboard-copilot-dialog-status')?.textContent)
      .toBe('Saved. Waiting for the preview to reload…');
    expect(debugMock).toHaveBeenCalledWith(expect.stringContaining(JSON.stringify({
      role: 'assistant',
      content: 'Added a trend.'
    }, null, 2)));
    expect(debugMock).toHaveBeenCalledWith(expect.stringContaining('Starting dashboard view update.'));
    expect(socket.sent[0]).toEqual({
      type: 'copilot.start',
      view: 'Overview',
      request: 'Add a trend'
    });
    debugMock.mockRestore();
  });

  it('stops the active session when the dialog closes', async () => {
    const socket = new MockSocket();
    const prompt = renderCopilotPrompt(/** @type {WebSocket} */ (/** @type {unknown} */ (socket)));
    document.body.prepend(prompt);
    const input = prompt.querySelector('input');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected prompt input');
    input.value = 'Add a trend';

    prompt.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const closeButton = prompt.querySelector('.dashboard-copilot-dialog-close');
    if (!(closeButton instanceof HTMLButtonElement)) throw new Error('Expected dialog close button');
    closeButton.click();

    expect(socket.sent).toEqual([
      { type: 'copilot.start', view: 'Overview', request: 'Add a trend' },
      { type: 'copilot.stop' }
    ]);
  });
});
