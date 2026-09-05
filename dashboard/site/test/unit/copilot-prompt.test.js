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
  it('renders an integrated chat and streams the Copilot response', async () => {
    document.body.innerHTML = '<a data-nav-page-id="overview" aria-current="page" aria-label="Overview"></a>';
    const debugMock = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const socket = new MockSocket();
    const prompt = renderCopilotPrompt(/** @type {WebSocket} */ (/** @type {unknown} */ (socket)));
    document.body.prepend(prompt);
    const input = prompt.querySelector('input');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected prompt input');
    input.value = 'Add a trend';

    prompt.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(input.value).toBe('');
    socket.emit({ type: 'debug', message: 'Starting dashboard view update.', details: { view: 'Overview' } });
    socket.emit({ type: 'assistant-delta', content: 'Adding ' });
    socket.emit({ type: 'assistant-delta', content: 'a trend.' });
    socket.emit({ type: 'assistant-message', content: 'Added a trend.' });
    socket.emit({ type: 'reloaded' });
    socket.emit({ type: 'done' });

    expect(prompt.querySelector('label')?.textContent).toBe('Modify this view');
    expect(prompt.querySelector('#dashboard-copilot-title')?.textContent).toBe('Copilot');
    expect(prompt.querySelector('dialog')).toBeNull();
    expect(prompt.querySelector('.dashboard-copilot-message-user')?.textContent).toContain('Add a trend');
    expect(prompt.querySelector('#dashboard-copilot-status')?.textContent).toBe('Updated.');
    expect(debugMock).toHaveBeenCalledWith(
      '[dashboard-copilot]',
      expect.stringContaining('"content":"Added a trend."')
    );
    expect(debugMock).toHaveBeenCalledWith(
      '[dashboard-copilot]',
      expect.stringContaining('Starting dashboard view update.')
    );
    const start = socket.sent.find((message) => message.type === 'copilot.start');
    expect(start).toEqual({
      type: 'copilot.start',
      traceId: expect.any(String),
      view: 'Overview',
      request: 'Add a trend'
    });
    expect(socket.sent).toContainEqual({
      type: 'browser.trace',
      traceId: start?.traceId,
      event: 'copilot.request.completed',
      details: { view: 'Overview' }
    });

    input.value = 'Add a second card';
    prompt.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    socket.emit({ type: 'assistant-message', content: 'I found the active view.' });
    socket.emit({ type: 'assistant-message', content: 'Added a second card.' });
    socket.emit({ type: 'done' });
    expect(prompt.querySelectorAll('.dashboard-copilot-message')).toHaveLength(5);
    expect(prompt.querySelector('.dashboard-copilot-conversation')?.textContent)
      .toContain('I found the active view.');
    expect(prompt.querySelector('.dashboard-copilot-conversation')?.textContent)
      .toContain('Added a second card.');
    debugMock.mockRestore();
  });

  it('changes the action icon to cancel while a session is active', async () => {
    const socket = new MockSocket();
    const prompt = renderCopilotPrompt(/** @type {WebSocket} */ (/** @type {unknown} */ (socket)));
    document.body.prepend(prompt);
    const input = prompt.querySelector('input');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected prompt input');
    input.value = 'Add a trend';

    prompt.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const actionButton = prompt.querySelector('.dashboard-copilot-action');
    if (!(actionButton instanceof HTMLButtonElement)) throw new Error('Expected Copilot action button');
    expect(actionButton.getAttribute('aria-label')).toBe('Cancel request');
    expect(actionButton.querySelector('.octicon-square-fill')).not.toBeNull();
    actionButton.click();

    const start = socket.sent.find((message) => message.type === 'copilot.start');
    expect(start).toEqual({
      type: 'copilot.start',
      traceId: expect.any(String),
      view: 'Overview',
      request: 'Add a trend'
    });
    expect(socket.sent).toContainEqual({ type: 'copilot.stop', traceId: start?.traceId });
    expect(socket.sent).toContainEqual({
      type: 'browser.trace',
      traceId: start?.traceId,
      event: 'copilot.stop.sent',
      details: {}
    });
    expect(actionButton.getAttribute('aria-label')).toBe('Send message');
    expect(actionButton.querySelector('.octicon-paper-airplane')).not.toBeNull();
  });
});
