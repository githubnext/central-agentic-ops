import { h } from './dom.js';

/**
 * @param {string} endpoint
 * @returns {HTMLFormElement}
 */
export function renderCopilotPrompt(endpoint) {
  const input = /** @type {HTMLInputElement} */ (h('input', {
    id: 'dashboard-copilot-request',
    name: 'request',
    type: 'text',
    required: true,
    maxLength: 10000,
    placeholder: 'Describe the change'
  }));
  const button = /** @type {HTMLButtonElement} */ (h('button', { type: 'submit' }, 'Send'));
  const status = h('output', {
    id: 'dashboard-copilot-status',
    'aria-live': 'polite'
  });
  const form = /** @type {HTMLFormElement} */ (h(
    'form',
    { id: 'dashboard-copilot-prompt', className: 'dashboard-copilot-prompt' },
    h('label', { htmlFor: input.id }, 'Ask Copilot to update this view'),
    input,
    button,
    status
  ));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const activeView = document.querySelector('[data-nav-page-id][aria-current=page]');
    const view = activeView?.getAttribute('aria-label')
      || activeView?.getAttribute('data-nav-page-id')
      || location.hash.match(/^#page-([^?]+)/)?.[1]
      || 'overview';
    button.disabled = true;
    status.textContent = 'Working…';
    console.log('Starting Copilot dashboard update.', { view, requestLength: input.value.length });
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ view, request: input.value })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Copilot could not update the view.');
      status.textContent = 'Saved. Waiting for the preview to reload…';
      input.value = '';
      console.log('Copilot dashboard update completed.', { view });
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : String(error);
      console.log('Copilot dashboard update failed.', {
        view,
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      button.disabled = false;
    }
  });
  return form;
}

const endpoint = new URL(import.meta.url).searchParams.get('endpoint');
if (endpoint) {
  console.log('Loading Copilot dashboard prompt.');
  document.body.prepend(renderCopilotPrompt(endpoint));
}
